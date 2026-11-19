import { internalAction, internalMutation, query } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import { addDays, assertYmd, weekStartFor } from "./dates";
import { fetchSchoolApi } from "./schoolApi";
import { cleanDishName } from "./text";
import {
  DINNER,
  LUNCH,
  mealFields,
  mealWeek,
  servedMealType,
  type MealDay,
  type PublicMeal,
  type ServedMealType,
} from "./validators";

// The fields of a NEIS meal row this app reads.
type FeedMeal = {
  MLSV_YMD: string; // YYYYMMDD
  MMEAL_SC_NM: string; // 중식 / 석식
  DDISH_NM: string; // newline separated
  ORPLC_INFO?: string;
  CAL_INFO?: string;
  NTR_INFO?: string;
  SD_SCHUL_CODE: string;
  SCHUL_NM: string;
  LOAD_DTM: string;
};


const mealKey = (m: { date: string; mealType: string }) => `${m.date} ${m.mealType}`;

export const upsertMany = internalMutation({
  args: { meals: v.array(v.object(mealFields).omit("editedAt")) },
  returns: v.null(),
  handler: async (ctx, { meals }) => {
    const unique = [...new Map(meals.map((meal) => [mealKey(meal), meal])).values()];
    const dates = unique.map((m) => m.date).sort();
    const first = dates[0];
    const last = dates[dates.length - 1];
    if (!first || !last) return null;

    // One range read over the batch, matched in memory.
    const existingRows = await ctx.db
      .query("meals")
      .withIndex("by_date_type", (q) => q.gte("date", first).lte("date", last))
      .collect();
    const existing = new Map(existingRows.map((row) => [mealKey(row), row]));

    const editedAt = Date.now();
    for (const meal of unique) {
      const row = existing.get(mealKey(meal));
      if (row) await ctx.db.patch(row._id, { ...meal, editedAt });
      else await ctx.db.insert("meals", { ...meal, editedAt });
    }
    return null;
  },
});

// Mon–Fri of the week `offsetWeeks` from this one (0 = this week).
export const fetchWeek = internalAction({
  args: { offsetWeeks: v.number() },
  returns: v.null(),
  handler: async (ctx, { offsetWeeks }): Promise<null> => {
    const startdate = weekStartFor(offsetWeeks);
    const data = await fetchSchoolApi("lunch", { startdate, enddate: addDays(startdate, 4) });
    // A week with no meals answers 200 with an INFO-200 object, not an array.
    if (!Array.isArray(data)) return null;

    const meals = (data as FeedMeal[])
      .filter((d) => d.MMEAL_SC_NM && d.DDISH_NM)
      .map((d) => ({
        date: d.MLSV_YMD,
        mealType: d.MMEAL_SC_NM,
        dishes: d.DDISH_NM.split("\n"),
        originInfo: d.ORPLC_INFO ?? "",
        calories: d.CAL_INFO ?? null,
        nutrients: d.NTR_INFO ?? null,
        schoolCode: d.SD_SCHUL_CODE,
        schoolName: d.SCHUL_NM,
        loadedAt: d.LOAD_DTM,
      }));
    if (meals.length > 0) await ctx.runMutation(internal.meals.upsertMany, { meals });
    return null;
  },
});

function projectMeal(m: Doc<"meals">): PublicMeal {
  return {
    date: m.date,
    mealType: m.mealType,
    dishes: m.dishes.map(cleanDishName).filter(Boolean),
    calories: m.calories,
    nutrients: m.nutrients,
  };
}

// The week starting `weekStart` (a Monday) and the one after it.
export const getTwoWeeks = query({
  args: { weekStart: v.string() },
  returns: v.object({
    thisWeek: mealWeek,
    nextWeek: mealWeek,
    availableMealTypes: v.array(servedMealType),
  }),
  handler: async (ctx, { weekStart }) => {
    assertYmd(weekStart, "weekStart");
    const rows = await ctx.db
      .query("meals")
      .withIndex("by_date_type", (q) => q.gte("date", weekStart).lte("date", addDays(weekStart, 11)))
      .collect();
    const byKey = new Map(rows.map((row) => [mealKey(row), projectMeal(row)]));

    const buildWeek = (start: string) => {
      const days: MealDay[] = Array.from({ length: 5 }, (_, i) => {
        const date = addDays(start, i);
        return {
          date,
          lunch: byKey.get(mealKey({ date, mealType: LUNCH })) ?? null,
          dinner: byKey.get(mealKey({ date, mealType: DINNER })) ?? null,
        };
      });
      return { startdate: start, enddate: addDays(start, 4), days };
    };
    const thisWeek = buildWeek(weekStart);
    const nextWeek = buildWeek(addDays(weekStart, 7));

    const allDays = [...thisWeek.days, ...nextWeek.days];
    const availableMealTypes: ServedMealType[] = [];
    if (allDays.some((d) => d.lunch)) availableMealTypes.push(LUNCH);
    if (allDays.some((d) => d.dinner)) availableMealTypes.push(DINNER);
    return { thisWeek, nextWeek, availableMealTypes };
  },
});
