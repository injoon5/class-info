import { internalAction, internalMutation, query } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

export const upsert = internalMutation({
  args: {
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
    { week, day_time, timetable, update_date }
  ): Promise<Id<"timetables">> => {
    const existing = await ctx.db
      .query("timetables")
      .filter((q) => q.eq(q.field("week"), week))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { day_time, timetable, update_date, week, editedAt: Date.now() });
      return existing._id;
    }

    return await ctx.db.insert("timetables", { day_time, timetable, update_date, week, editedAt: Date.now() });
  },
});

export const fetchAndSave = internalAction({
  args: {
    grade: v.number(),
    classno: v.number(),
    week: v.number(),
    schoolcode: v.string(),
  },
  handler: async (
    ctx,
    { grade, classno, week, schoolcode }
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

    const id = await ctx.runMutation(internal.timetable.upsert, {
      week,
      day_time: data.day_time,
      timetable: data.timetable,
      update_date: data.update_date,
    });
    return id;
  },
});

export const getByWeek = query({
  args: { week: v.number() },
  handler: async (ctx, { week }) => {
    return await ctx.db
      .query("timetables")
      .filter((q) => q.eq(q.field("week"), week))
      .first();
  },
});


