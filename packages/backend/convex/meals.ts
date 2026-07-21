import { internalAction, internalMutation, query } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { getWeekRangeKst, toYyyymmdd } from "./dates";

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
    if (meals.length === 0) return;

    // One indexed range read over the batch's date span, then match in memory,
    // instead of a separate query per meal.
    const dates = meals.map((m) => m.date).sort();
    const existingRows = await ctx.db
      .query("meals")
      .withIndex("by_date_type", (q) =>
        q.gte("date", dates[0]).lte("date", dates[dates.length - 1])
      )
      .collect();
    const existingByKey = new Map(existingRows.map((r) => [`${r.date} ${r.mealType}`, r]));

    let updated = 0, inserted = 0;
    for (const meal of meals) {
      const existing = existingByKey.get(`${meal.date} ${meal.mealType}`);
      if (existing) {
        await ctx.db.patch(existing._id, { ...meal, editedAt: Date.now() });
        updated++;
      } else {
        await ctx.db.insert("meals", { ...meal, editedAt: Date.now() });
        inserted++;
      }
    }
    console.log(`[meals.upsertMany] updated=${updated} inserted=${inserted}`);
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
    const data = await res.json();

    // Ignore INFO-200 "해당하는 데이터가 없습니다." error response
    if (!Array.isArray(data)) return;

    const meals = (data as ExternalMeal[])
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

    console.log(`[meals.fetchAndSave] range=${startdate}–${enddate} fetched=${meals.length}`);
    if (meals.length > 0) {
      await ctx.runMutation(internal.meals.upsertMany, { meals });
    }
  },
});

// Fetch a single KST week (offsetWeeks: 0 = this week, 1 = next week).
export const fetchWeek = internalAction({
  args: { schoolcode: v.string(), offsetWeeks: v.number() },
  handler: async (ctx, { schoolcode, offsetWeeks }) => {
    const { start, end } = getWeekRangeKst(offsetWeeks);
    await ctx.runAction(internal.meals.fetchAndSave, {
      startdate: toYyyymmdd(start),
      enddate: toYyyymmdd(end),
      schoolcode,
    });
  },
});

export const getTwoWeeks = query({
  args: {},
  handler: async (ctx) => {
    const buildWeek = async (offset: number) => {
      const { start, end } = getWeekRangeKst(offset);
      const startdate = toYyyymmdd(start);
      const enddate = toYyyymmdd(end);
      const rows = await ctx.db
        .query("meals")
        .withIndex("by_date_type", (q) => q.gte("date", startdate).lte("date", enddate))
        .collect();

      const days: { date: string; lunch: typeof rows[number] | null; dinner: typeof rows[number] | null }[] = [];
      const d = new Date(start);
      while (d <= end) {
        const yyyymmdd = toYyyymmdd(d);
        const lunch = rows.find((m) => m.date === yyyymmdd && m.mealType === "중식") ?? null;
        const dinner = rows.find((m) => m.date === yyyymmdd && m.mealType === "석식") ?? null;
        days.push({ date: yyyymmdd, lunch, dinner });
        d.setDate(d.getDate() + 1);
      }
      return { startdate, enddate, days };
    };

    const thisWeek = await buildWeek(0);
    const nextWeek = await buildWeek(1);

    const allDays = [...thisWeek.days, ...nextWeek.days];
    const availableMealTypes: string[] = [];
    if (allDays.some((d) => d.lunch !== null)) availableMealTypes.push("중식");
    if (allDays.some((d) => d.dinner !== null)) availableMealTypes.push("석식");

    return { thisWeek, nextWeek, availableMealTypes };
  },
});
