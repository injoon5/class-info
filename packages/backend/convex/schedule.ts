import { internalAction, internalMutation, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

type ExternalScheduleEvent = {
  AA_YMD: string; // YYYYMMDD
  EVENT_NM: string;
  SBTR_DD_SC_NM: string;
  SD_SCHUL_CODE: string;
};

export const upsertManySchoolEvents = internalMutation({
  args: {
    events: v.array(
      v.object({
        date: v.string(),
        eventName: v.string(),
        eventType: v.string(),
        schoolCode: v.string(),
      })
    ),
    startdate: v.string(), // YYYYMMDD — range to clear before re-inserting
    enddate: v.string(),
  },
  handler: async (ctx, { events, startdate, enddate }) => {
    const existing = await ctx.db
      .query("schoolScheduleEvents")
      .withIndex("by_date", (q) => q.gte("date", startdate).lte("date", enddate))
      .collect();

    for (const ev of existing) {
      await ctx.db.delete(ev._id);
    }
    for (const ev of events) {
      await ctx.db.insert("schoolScheduleEvents", { ...ev, editedAt: Date.now() });
    }
  },
});

export const fetchAndSaveSchoolSchedule = internalAction({
  args: { startdate: v.string(), enddate: v.string(), schoolcode: v.string() },
  handler: async (ctx, { startdate, enddate, schoolcode }) => {
    const url = `https://api.timefor.school/schedule?startdate=${encodeURIComponent(startdate)}&enddate=${encodeURIComponent(enddate)}&schoolcode=${encodeURIComponent(schoolcode)}`;
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) {
      throw new Error(`Failed to fetch schedule: ${res.status} ${res.statusText}`);
    }
    const data = await res.json();
    if (!Array.isArray(data)) return;

    const events = (data as ExternalScheduleEvent[])
      .filter((d) => d.AA_YMD && d.EVENT_NM)
      .map((d) => ({
        date: d.AA_YMD,
        eventName: d.EVENT_NM,
        eventType: d.SBTR_DD_SC_NM ?? "",
        schoolCode: d.SD_SCHUL_CODE ?? schoolcode,
      }));

    await ctx.runMutation(internal.schedule.upsertManySchoolEvents, { events, startdate, enddate });
  },
});

// Fetches last December through next February — the window shown to users.
export const fetchScheduleWindow = internalAction({
  args: { schoolcode: v.string() },
  handler: async (ctx, { schoolcode }) => {
    const now = new Date();
    const y = now.getUTCFullYear();
    const startdate = `${y - 1}1201`;
    const nextFebYear = y + 1;
    const isLeap = (nextFebYear % 4 === 0 && nextFebYear % 100 !== 0) || nextFebYear % 400 === 0;
    const enddate = `${nextFebYear}02${isLeap ? "29" : "28"}`;
    await ctx.runAction(internal.schedule.fetchAndSaveSchoolSchedule, { startdate, enddate, schoolcode });
  },
});

export const getSchoolEventsByYear = query({
  args: { year: v.string() },
  handler: async (ctx, { year }) => {
    return await ctx.db
      .query("schoolScheduleEvents")
      .withIndex("by_date", (q) =>
        q.gte("date", `${year}0101`).lte("date", `${year}1231`)
      )
      .collect();
  },
});

export const getCustomEventsByYear = query({
  args: { year: v.string() },
  handler: async (ctx, { year }) => {
    return await ctx.db
      .query("customScheduleEvents")
      .withIndex("by_date", (q) =>
        q.gte("date", `${year}0101`).lte("date", `${year}1231`)
      )
      .collect();
  },
});

export const createCustomEvent = mutation({
  args: {
    date: v.string(),
    title: v.string(),
    color: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("customScheduleEvents", {
      ...args,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const deleteCustomEvent = mutation({
  args: { id: v.id("customScheduleEvents") },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
  },
});
