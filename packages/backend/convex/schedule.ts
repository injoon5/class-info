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
      .query("schedules")
      .withIndex("by_date", (q) => q.gte("date", startdate).lte("date", enddate))
      .collect();

    for (const ev of existing) {
      if (ev.source !== "custom") await ctx.db.delete(ev._id);
    }
    const now = Date.now();
    for (const ev of events) {
      await ctx.db.insert("schedules", {
        date: ev.date,
        title: ev.eventName,
        source: "school",
        eventType: ev.eventType,
        schoolCode: ev.schoolCode,
        createdAt: now,
        updatedAt: now,
      });
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
    const m = now.getUTCMonth() + 1; // 1-12
    const startdate = `${y - 1}1201`;
    const nextFebYear = m <= 2 ? y : y + 1;
    const isLeap = (nextFebYear % 4 === 0 && nextFebYear % 100 !== 0) || nextFebYear % 400 === 0;
    const enddate = `${nextFebYear}02${isLeap ? "29" : "28"}`;
    console.log(`[fetchScheduleWindow] now=${now.toISOString()} utcYear=${y} utcMonth=${m} schoolcode=${schoolcode}`);
    console.log(`[fetchScheduleWindow] startdate=${startdate} enddate=${enddate} nextFebYear=${nextFebYear} isLeap=${isLeap}`);
    await ctx.runAction(internal.schedule.fetchAndSaveSchoolSchedule, { startdate, enddate, schoolcode });
    console.log(`[fetchScheduleWindow] done`);
  },
});

export const getSchoolEventsByYear = query({
  args: { year: v.string() },
  handler: async (ctx, { year }) => {
    const all = await ctx.db
      .query("schedules")
      .withIndex("by_date", (q) =>
        q.gte("date", `${year}0101`).lte("date", `${year}1231`)
      )
      .collect();
    return all.filter((e) => e.source === "school");
  },
});

export const getCustomEventsByYear = query({
  args: { year: v.string() },
  handler: async (ctx, { year }) => {
    const all = await ctx.db
      .query("schedules")
      .withIndex("by_date", (q) =>
        q.gte("date", `${year}0101`).lte("date", `${year}1231`)
      )
      .collect();
    return all.filter((e) => e.source === "custom");
  },
});

export const createCustomEvent = mutation({
  args: {
    date: v.string(),
    title: v.string(),
    color: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("schedules", {
      ...args,
      source: "custom",
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const deleteCustomEvent = mutation({
  args: { id: v.id("schedules") },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
  },
});
