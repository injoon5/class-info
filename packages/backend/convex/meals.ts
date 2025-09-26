import { internalAction, internalMutation, query } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

type ExternalMeal = {
  ATPT_OFCDC_SC_CODE: string;
  ATPT_OFCDC_SC_NM: string;
  LOAD_DTM: string; // YYYYMMDD
  SD_SCHUL_CODE: string; // schoolcode
  SCHUL_NM: string;
  MMEAL_SC_CODE: string; // 2 = lunch
  MMEAL_SC_NM: string; // 중식
  MLSV_YMD: string; // YYYYMMDD
  DDISH_NM: string; // newline separated
  ORPLC_INFO: string;
  CAL_INFO?: string;
  NTR_INFO?: string;
  MLSV_FROM_YMD: string; // YYYYMMDD
  MLSV_TO_YMD: string; // YYYYMMDD
};

function formatAsYyyymmddKst(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

function getNowInKst(): Date {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60_000;
  return new Date(utc + 9 * 60 * 60_000);
}

function getWeekRangeKst(offsetWeeks: number): { start: Date; end: Date } {
  const nowKst = getNowInKst();
  const day = nowKst.getDay(); // 0 Sun ... 6 Sat
  const monday = new Date(nowKst);
  const diffToMon = (day === 0 ? -6 : 1 - day) + offsetWeeks * 7; // move to Monday
  monday.setDate(nowKst.getDate() + diffToMon);
  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 4);
  // Normalize times to noon to avoid DST edge cases
  monday.setHours(12, 0, 0, 0);
  friday.setHours(12, 0, 0, 0);
  return { start: monday, end: friday };
}

export const upsertMany = internalMutation({
  args: {
    meals: v.array(
      v.object({
        date: v.string(),
        mealType: v.string(),
        dishes: v.array(v.string()),
        originInfo: v.string(),
        calories: v.union(v.string(), v.null()),
        nutrients: v.union(v.string(), v.null()),
        schoolCode: v.string(),
        schoolName: v.string(),
        loadedAt: v.string(),
      })
    ),
  },
  handler: async (ctx, { meals }) => {
    for (const meal of meals) {
      const existing = await ctx.db
        .query("meals")
        .withIndex("by_date_type", (q) => q.eq("date", meal.date).eq("mealType", meal.mealType))
        .first();

      if (existing) {
        await ctx.db.patch(existing._id, { ...meal, editedAt: Date.now() });
      } else {
        await ctx.db.insert("meals", { ...meal, editedAt: Date.now() });
      }
    }
  },
});

export const fetchAndSave = internalAction({
  args: {
    startdate: v.string(), // YYYYMMDD
    enddate: v.string(), // YYYYMMDD
    schoolcode: v.string(),
  },
  handler: async (ctx, { startdate, enddate, schoolcode }) => {
    const url = `https://api.timefor.school/lunch?startdate=${encodeURIComponent(startdate)}&enddate=${encodeURIComponent(enddate)}&schoolcode=${encodeURIComponent(schoolcode)}`;

    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) {
      throw new Error(`Failed to fetch meals: ${res.status} ${res.statusText}`);
    }
    const data: ExternalMeal[] = await res.json();

    const meals = data
      .filter((d) => d.MMEAL_SC_NM && d.DDISH_NM)
      .map((d) => ({
        date: d.MLSV_YMD,
        mealType: d.MMEAL_SC_NM,
        dishes: d.DDISH_NM.split("\n").map((s) => s.trim()).filter(Boolean),
        originInfo: d.ORPLC_INFO ?? "",
        calories: d.CAL_INFO ?? null,
        nutrients: d.NTR_INFO ?? null,
        schoolCode: d.SD_SCHUL_CODE,
        schoolName: d.SCHUL_NM,
        loadedAt: d.LOAD_DTM,
      }));

    if (meals.length > 0) {
      await ctx.runMutation(internal.meals.upsertMany, { meals });
    }
  },
});

export const fetchCurrentWeek = internalAction({
  args: { schoolcode: v.string() },
  handler: async (ctx, { schoolcode }) => {
    const { start, end } = getWeekRangeKst(0);
    await ctx.runAction(internal.meals.fetchAndSave, {
      startdate: formatAsYyyymmddKst(start),
      enddate: formatAsYyyymmddKst(end),
      schoolcode,
    });
  },
});

export const fetchNextWeek = internalAction({
  args: { schoolcode: v.string() },
  handler: async (ctx, { schoolcode }) => {
    const { start, end } = getWeekRangeKst(1);
    await ctx.runAction(internal.meals.fetchAndSave, {
      startdate: formatAsYyyymmddKst(start),
      enddate: formatAsYyyymmddKst(end),
      schoolcode,
    });
  },
});

export const getRange = query({
  args: {
    startdate: v.string(), // YYYYMMDD inclusive
    enddate: v.string(), // YYYYMMDD inclusive
    mealType: v.optional(v.string()),
  },
  handler: async (ctx, { startdate, enddate, mealType }) => {
    const results = await ctx.db
      .query("meals")
      .withIndex("by_date", (q) => q.gte("date", startdate).lte("date", enddate))
      .collect();
    const filtered = mealType ? results.filter((m) => m.mealType === mealType) : results;
    return filtered.sort((a, b) => a.date.localeCompare(b.date));
  },
});

function getDisplayWeekOffsetKst(): 0 | 1 {
  const now = getNowInKst();
  const day = now.getDay(); // 0-6
  // After Friday 16:00 KST, show next week
  if (day === 6 || day === 0) return 1; // Sat or Sun
  if (day === 5) {
    const hour = now.getHours();
    if (hour >= 16) return 1;
  }
  return 0;
}

export const getDisplayWeek = query({
  args: {},
  handler: async (ctx) => {
    const offset = getDisplayWeekOffsetKst();
    const { start, end } = getWeekRangeKst(offset);
    const startdate = formatAsYyyymmddKst(start);
    const enddate = formatAsYyyymmddKst(end);
    const rows = await ctx.db
      .query("meals")
      .withIndex("by_date", (q) => q.gte("date", startdate).lte("date", enddate))
      .collect();
    const meals = rows.filter((m) => m.mealType === "중식").sort((a, b) => a.date.localeCompare(b.date));

    // Build normalized Mon-Fri day list
    const days: { date: string; meal: typeof meals[number] | null }[] = [];
    const d = new Date(start);
    while (d <= end) {
      const yyyymmdd = formatAsYyyymmddKst(d);
      const meal = meals.find((m) => m.date === yyyymmdd) ?? null;
      days.push({ date: yyyymmdd, meal });
      d.setDate(d.getDate() + 1);
    }

    return { meals, days, weekOffset: offset, startdate, enddate };
  },
});

export const getTwoWeeks = query({
  args: {},
  handler: async (ctx) => {
    const buildWeek = async (offset: number) => {
      const { start, end } = getWeekRangeKst(offset);
      const startdate = formatAsYyyymmddKst(start);
      const enddate = formatAsYyyymmddKst(end);
      const rows = await ctx.db
        .query("meals")
        .withIndex("by_date", (q) => q.gte("date", startdate).lte("date", enddate))
        .collect();
      const meals = rows.filter((m) => m.mealType === "중식").sort((a, b) => a.date.localeCompare(b.date));
      const days: { date: string; meal: typeof meals[number] | null }[] = [];
      const d = new Date(start);
      while (d <= end) {
        const yyyymmdd = formatAsYyyymmddKst(d);
        const meal = meals.find((m) => m.date === yyyymmdd) ?? null;
        days.push({ date: yyyymmdd, meal });
        d.setDate(d.getDate() + 1);
      }
      return { startdate, enddate, days };
    };

    const thisWeek = await buildWeek(0);
    const nextWeek = await buildWeek(1);
    return { thisWeek, nextWeek };
  },
});


