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

    const toDelete = existing.filter((ev) => ev.source !== "custom");

    for (const ev of toDelete) {
      await ctx.db.delete(ev._id);
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
    console.log(`[schedule.upsertManySchoolEvents] range=${startdate}–${enddate} deleted=${toDelete.length} inserted=${events.length}`);
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
    if (!Array.isArray(data)) {
      return;
    }

    const events = (data as ExternalScheduleEvent[])
      .filter((d) => d.AA_YMD && d.EVENT_NM)
      .map((d) => ({
        date: d.AA_YMD,
        eventName: d.EVENT_NM,
        eventType: d.SBTR_DD_SC_NM ?? "",
        schoolCode: d.SD_SCHUL_CODE ?? schoolcode,
      }));

    console.log(`[schedule.fetchAndSaveSchoolSchedule] range=${startdate}–${enddate} events=${events.length}`);
    await ctx.runMutation(internal.schedule.upsertManySchoolEvents, { events, startdate, enddate });
  },
});

function splitInto3MonthChunks(startdate: string, enddate: string) {
  const chunks: { start: string; end: string }[] = [];

  let curYear = parseInt(startdate.slice(0, 4));
  let curMonth = parseInt(startdate.slice(4, 6));
  let curStart = startdate;

  while (curStart <= enddate) {
    let endMonth = curMonth + 2;
    let endYear = curYear;
    if (endMonth > 12) {
      endMonth -= 12;
      endYear++;
    }

    const lastDay = new Date(Date.UTC(endYear, endMonth, 0)).getUTCDate();
    const pad = (n: number) => String(n).padStart(2, "0");
    const chunkEnd = `${endYear}${pad(endMonth)}${pad(lastDay)}`;
    const actualEnd = chunkEnd < enddate ? chunkEnd : enddate;

    chunks.push({ start: curStart, end: actualEnd });

    if (actualEnd >= enddate) break;

    let nextMonth = endMonth + 1;
    let nextYear = endYear;
    if (nextMonth > 12) {
      nextMonth = 1;
      nextYear++;
    }

    curYear = nextYear;
    curMonth = nextMonth;
    curStart = `${nextYear}${pad(nextMonth)}01`;
  }

  return chunks;
}

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

    const chunks = splitInto3MonthChunks(startdate, enddate);
    for (const chunk of chunks) {
      await ctx.runAction(internal.schedule.fetchAndSaveSchoolSchedule, {
        startdate: chunk.start,
        enddate: chunk.end,
        schoolcode,
      });
    }
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
