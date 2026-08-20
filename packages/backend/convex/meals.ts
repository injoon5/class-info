import { internalAction, internalMutation, query, type ActionCtx } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { addDaysYyyymmdd, getWeekRangeKst, parseYyyymmdd, toYyyymmdd } from "./dates";
import { schoolDataUrl } from "./class";
import { projectMeal } from "./project";
import { mealWeek } from "./validators";

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
  returns: v.null(),
  handler: async (ctx, { meals }) => {
    if (meals.length === 0) return null;

    // One indexed range read over the batch's date span, then match in memory,
    // instead of a separate query per meal.
    const byKey = new Map<string, (typeof meals)[number]>();
    for (const meal of meals) byKey.set(`${meal.date} ${meal.mealType}`, meal);
    const uniqueMeals = [...byKey.values()];
    const dates = uniqueMeals.map((m) => m.date).sort();
    const rangeStart = dates[0];
    const rangeEnd = dates[dates.length - 1];
    if (!rangeStart || !rangeEnd) return null;
    const existingRows = await ctx.db
      .query("meals")
      .withIndex("by_date_type", (q) =>
        q.gte("date", rangeStart).lte("date", rangeEnd)
      )
      .collect();
    const existingByKey = new Map(existingRows.map((r) => [`${r.date} ${r.mealType}`, r]));

    const now = Date.now();
    let updated = 0, inserted = 0;
    for (const meal of uniqueMeals) {
      const existing = existingByKey.get(`${meal.date} ${meal.mealType}`);
      if (existing) {
        await ctx.db.patch(existing._id, { ...meal, editedAt: now });
        updated++;
      } else {
        await ctx.db.insert("meals", { ...meal, editedAt: now });
        inserted++;
      }
    }
    console.log(`[meals.upsertMany] updated=${updated} inserted=${inserted}`);
    return null;
  },
});

async function pullMeals(
  ctx: ActionCtx,
  startdate: string,
  enddate: string,
  schoolcode: string
): Promise<void> {
  const url = schoolDataUrl("/lunch", { startdate, enddate, schoolcode });

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

  console.log(`[meals.pullMeals] range=${startdate}–${enddate} fetched=${meals.length}`);
  if (meals.length > 0) {
    await ctx.runMutation(internal.meals.upsertMany, { meals });
  }
}

// Fetch a single KST week (offsetWeeks: 0 = this week, 1 = next week).
// Cron args are static, so the week bounds are computed at run time here.
export const fetchWeek = internalAction({
  args: { schoolcode: v.string(), offsetWeeks: v.number() },
  returns: v.null(),
  handler: async (ctx, { schoolcode, offsetWeeks }) => {
    const { start, end } = getWeekRangeKst(offsetWeeks);
    await pullMeals(ctx, toYyyymmdd(start), toYyyymmdd(end), schoolcode);
    return null;
  },
});

export const getTwoWeeks = query({
  // weekStart is optional so a Convex deploy that lands before the frontend
  // doesn't 500 old clients that called this with {}.
  args: { weekStart: v.optional(v.string()) },
  returns: v.object({
    thisWeek: mealWeek,
    nextWeek: mealWeek,
    availableMealTypes: v.array(v.string()),
  }),
  handler: async (ctx, { weekStart: weekStartArg }) => {
    const weekStart =
      weekStartArg && parseYyyymmdd(weekStartArg)
        ? weekStartArg
        : toYyyymmdd(getWeekRangeKst(0).start);
    const thisEnd = addDaysYyyymmdd(weekStart, 4);
    const nextStart = addDaysYyyymmdd(weekStart, 7);
    const nextEnd = addDaysYyyymmdd(weekStart, 11);

    const rows = await ctx.db
      .query("meals")
      .withIndex("by_date_type", (q) => q.gte("date", weekStart).lte("date", nextEnd))
      .collect();

    const byDateType = new Map<string, NonNullable<ReturnType<typeof projectMeal>>>();
    for (const m of rows) {
      const pub = projectMeal(m);
      if (pub) byDateType.set(`${pub.date}:${pub.mealType}`, pub);
    }

    const buildWeek = (start: string, end: string) => {
      const days: {
        date: string;
        lunch: NonNullable<ReturnType<typeof projectMeal>> | null;
        dinner: NonNullable<ReturnType<typeof projectMeal>> | null;
      }[] = [];
      let cursor = start;
      while (cursor <= end) {
        days.push({
          date: cursor,
          lunch: byDateType.get(`${cursor}:중식`) ?? null,
          dinner: byDateType.get(`${cursor}:석식`) ?? null,
        });
        cursor = addDaysYyyymmdd(cursor, 1);
      }
      return { startdate: start, enddate: end, days };
    };

    const thisWeek = buildWeek(weekStart, thisEnd);
    const nextWeek = buildWeek(nextStart, nextEnd);

    const allDays = [...thisWeek.days, ...nextWeek.days];
    const availableMealTypes: string[] = [];
    if (allDays.some((d) => d.lunch !== null)) availableMealTypes.push("중식");
    if (allDays.some((d) => d.dinner !== null)) availableMealTypes.push("석식");

    return { thisWeek, nextWeek, availableMealTypes };
  },
});
