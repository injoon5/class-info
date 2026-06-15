import { internalAction, internalMutation, query } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

export const upsert = internalMutation({
  args: {
    classId: v.id("classes"),
    week: v.number(),
    day_time: v.array(v.string()),
    timetable: v.array(
      v.array(
        v.object({
          period: v.number(),
          subject: v.string(),
          teacher: v.string(),
          replaced: v.boolean(),
          original: v.union(
            v.null(),
            v.object({ period: v.number(), subject: v.string(), teacher: v.string() })
          ),
        })
      )
    ),
    update_date: v.string(),
  },
  handler: async (
    ctx,
    { classId, week, day_time, timetable, update_date }
  ): Promise<Id<"timetables">> => {
    const existing = await ctx.db
      .query("timetables")
      .withIndex("by_class_week", (q) => q.eq("classId", classId).eq("week", week))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { day_time, timetable, update_date, week, editedAt: Date.now() });
      console.log(`[timetable.upsert] updated class=${classId} week=${week}`);
      return existing._id;
    }

    const id = await ctx.db.insert("timetables", { classId, day_time, timetable, update_date, week, editedAt: Date.now() });
    console.log(`[timetable.upsert] inserted class=${classId} week=${week}`);
    return id;
  },
});

export const fetchAndSave = internalAction({
  args: {
    classId: v.id("classes"),
    grade: v.number(),
    classno: v.number(),
    week: v.number(),
    schoolcode: v.string(),
  },
  handler: async (
    ctx,
    { classId, grade, classno, week, schoolcode }
  ): Promise<Id<"timetables">> => {
    const url = `https://api.timefor.school/timetable?grade=${encodeURIComponent(
      String(grade)
    )}&classno=${encodeURIComponent(String(classno))}&week=${encodeURIComponent(
      String(week)
    )}&schoolcode=${encodeURIComponent(schoolcode)}`;

    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) {
      throw new Error(`Failed to fetch timetable: ${res.status} ${res.statusText}`);
    }
    const data: {
      day_time: string[];
      timetable: Array<
        Array<{
          period: number;
          subject: string;
          teacher: string;
          replaced: boolean;
          original: null | { period: number; subject: string; teacher: string };
        }>
      >;
      update_date: string;
    } = await res.json();

    // Basic shape validation
    if (!Array.isArray(data.day_time) || !Array.isArray(data.timetable)) {
      throw new Error("Unexpected timetable payload shape");
    }

    console.log(`[timetable.fetchAndSave] grade=${grade} class=${classno} week=${week}`);
    const id = await ctx.runMutation(internal.timetable.upsert, {
      classId,
      week,
      day_time: data.day_time,
      timetable: data.timetable,
      update_date: data.update_date,
    });
    return id;
  },
});

// Cron orchestrator: refresh timetables for every registered class.
export const fetchAllClasses = internalAction({
  args: { week: v.number() },
  handler: async (ctx, { week }) => {
    const classes = await ctx.runQuery(internal.classes.listAllClasses, {});
    for (const c of classes) {
      try {
        await ctx.runAction(internal.timetable.fetchAndSave, {
          classId: c._id,
          grade: c.grade,
          classno: c.classNo,
          week,
          schoolcode: c.schoolCode,
        });
      } catch (err) {
        console.error(`[timetable.fetchAllClasses] failed class=${c._id} week=${week}`, err);
      }
    }
  },
});

export const getByWeek = query({
  args: { classId: v.id("classes"), week: v.number() },
  handler: async (ctx, { classId, week }) => {
    return await ctx.db
      .query("timetables")
      .withIndex("by_class_week", (q) => q.eq("classId", classId).eq("week", week))
      .first();
  },
});


