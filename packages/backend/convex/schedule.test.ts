/// <reference types="vite/client" />
import { describe, expect, test } from "vitest";
import { convexTest } from "convex-test";
import { api, internal } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.*s");

const THU = "20260820";
const FRI = "20260821";
const SAT = "20260822";
const NEXT_MON = "20260824";

type Seed = {
  date: string;
  title: string;
  eventType?: string;
  source?: "school" | "custom";
  dday?: boolean;
};

async function withSchedule(seed: Seed[]) {
  const t = convexTest(schema, modules);
  await t.run(async (ctx) => {
    const now = Date.now();
    for (const row of seed) {
      await ctx.db.insert("schedules", {
        date: row.date,
        title: row.title,
        source: row.source ?? "school",
        ...(row.eventType === undefined ? {} : { eventType: row.eventType }),
        ...(row.dday ? { dday: true } : {}),
        createdAt: now,
        updatedAt: now,
      });
    }
  });
  return t;
}

describe("schedule.schoolDisplayDay", () => {
  test("rolls over to the next school day after 4pm", async () => {
    const t = await withSchedule([]);
    expect(await t.query(api.schedule.schoolDisplayDay, { today: THU, afterRollover: false })).toBe(THU);
    expect(await t.query(api.schedule.schoolDisplayDay, { today: THU, afterRollover: true })).toBe(FRI);
    expect(await t.query(api.schedule.schoolDisplayDay, { today: SAT, afterRollover: false })).toBe(NEXT_MON);
  });

  // The regression this suite exists for: the query used to read the index from
  // `today` forward, so a break already under way had no marker in range and
  // every day inside it was reported as a school day.
  test("stays on 개학 from every day inside a break, not just its first", async () => {
    const t = await withSchedule([
      { date: "20260717", title: "여름방학식" },
      { date: "20260720", title: "여름방학" },
      { date: "20260818", title: "개학" },
    ]);
    for (const today of ["20260720", "20260721", "20260731", "20260817"]) {
      expect(await t.query(api.schedule.schoolDisplayDay, { today, afterRollover: false })).toBe("20260818");
    }
  });

  test("a custom event mentioning 방학 does not close the school", async () => {
    const t = await withSchedule([
      { date: NEXT_MON, title: "방학 과제 제출일", source: "custom" },
    ]);
    expect(await t.query(api.schedule.schoolDisplayDay, { today: NEXT_MON, afterRollover: false })).toBe(NEXT_MON);
  });

  test("rejects a malformed date", async () => {
    const t = await withSchedule([]);
    await expect(
      t.query(api.schedule.schoolDisplayDay, { today: "2026-08-20", afterRollover: false }),
    ).rejects.toThrow(/today/);
  });
});

describe("schedule.homeSchedule", () => {
  test("returns the display day and only the events the page renders", async () => {
    const t = await withSchedule([
      { date: "20260810", title: "지난 일정" }, // before today — not shipped
      { date: THU, title: "오늘 일정" },
      { date: NEXT_MON, title: "다음주 일정" },
      { date: "20260930", title: "먼 일정" }, // past the window — not shipped
    ]);
    const { displayDay, events } = await t.query(api.schedule.homeSchedule, {
      today: THU,
      afterRollover: false,
    });
    expect(displayDay).toBe(THU);
    expect(events.map((e) => e.title)).toEqual(["오늘 일정", "다음주 일정"]);
  });

  test("the event window follows the display day across a weekend", async () => {
    const t = await withSchedule([
      { date: SAT, title: "주말 행사" },
      { date: "20260828", title: "금요일 행사" }, // display day + 4
      { date: "20260902", title: "창밖 행사" }, // display day + 9, out of window
    ]);
    const { displayDay, events } = await t.query(api.schedule.homeSchedule, {
      today: SAT,
      afterRollover: false,
    });
    expect(displayDay).toBe(NEXT_MON);
    // Spans from today, so an event happening today is still listed.
    expect(events.map((e) => e.title)).toEqual(["주말 행사", "금요일 행사"]);
  });

  test("agrees with schoolDisplayDay", async () => {
    const t = await withSchedule([{ date: NEXT_MON, title: "개교기념일", eventType: "휴업일" }]);
    const args = { today: FRI, afterRollover: true };
    const { displayDay } = await t.query(api.schedule.homeSchedule, args);
    expect(displayDay).toBe(await t.query(api.schedule.schoolDisplayDay, args));
    expect(displayDay).toBe("20260825");
  });
});

describe("schedule D-days", () => {
  test("homeSchedule ships countdowns from outside the event window", async () => {
    const t = await withSchedule([
      { date: "20260810", title: "지난 시험", dday: true }, // already gone
      { date: NEXT_MON, title: "수행평가", dday: true },
      { date: "20260930", title: "중간고사", dday: true }, // past the event window
      { date: "20261001", title: "그냥 일정" }, // not flagged
    ]);
    const { events, ddays } = await t.query(api.schedule.homeSchedule, {
      today: THU,
      afterRollover: false,
    });
    expect(ddays.map((e) => e.title)).toEqual(["수행평가", "중간고사"]);
    expect(ddays.every((e) => e.dday === true)).toBe(true);
    // The countdown reaches further than the event list does, on purpose.
    expect(events.map((e) => e.title)).toEqual(["수행평가"]);
  });

  // The regression this exists for: countdowns used to be filtered out of the
  // school-day scan, which stops a fixed lookahead past today. Anything further
  // out — a 수능 or a 졸업식, which is most of what gets pinned — was silently
  // absent from home while still showing as flagged on the calendar.
  test("a countdown months out still reaches home", async () => {
    const t = await withSchedule([
      { date: "20261119", title: "수능", dday: true }, // ~3 months out
      { date: "20270216", title: "졸업식", dday: true }, // ~6 months out
    ]);
    const { ddays } = await t.query(api.schedule.homeSchedule, {
      today: THU,
      afterRollover: false,
    });
    expect(ddays.map((e) => e.title)).toEqual(["수능", "졸업식"]);
  });

  // Un-flagging patches `dday: false` rather than removing the key, so `false`
  // rows sit in the same index as the `true` ones and must not be read back.
  test("an un-flagged event drops off home", async () => {
    const t = await withSchedule([{ date: NEXT_MON, title: "수행평가", dday: true }]);
    const clock = { today: THU, afterRollover: false };

    const before = await t.query(api.schedule.homeSchedule, clock);
    expect(before.ddays.map((e) => e.title)).toEqual(["수행평가"]);

    const id = before.ddays[0]!._id;
    await t.run(async (ctx) => {
      await ctx.db.patch(id, { dday: false });
    });

    const after = await t.query(api.schedule.homeSchedule, clock);
    expect(after.ddays).toEqual([]);
  });

  test("countdowns are capped, nearest first", async () => {
    const t = await withSchedule(
      ["20260901", "20260825", "20260910", "20260830"].map((date) => ({
        date,
        title: date,
        dday: true,
      })),
    );
    const { ddays } = await t.query(api.schedule.homeSchedule, {
      today: THU,
      afterRollover: false,
    });
    expect(ddays.map((e) => e.date)).toEqual(["20260825", "20260830"]);
  });

  // A sync deletes and re-inserts every school row in the range, so a flag set
  // on one has to be re-attached by (date, title) or it is lost on the next cron.
  test("a school event's D-day survives a schedule sync", async () => {
    const t = await withSchedule([
      { date: NEXT_MON, title: "중간고사", eventType: "학사일정", dday: true },
      { date: FRI, title: "체육대회", eventType: "학사일정" },
      { date: FRI, title: "반티 주문", source: "custom", dday: true },
    ]);

    await t.mutation(internal.schedule.upsertManySchoolEvents, {
      startdate: THU,
      enddate: "20260831",
      events: [
        { date: NEXT_MON, eventName: "중간고사", eventType: "학사일정", schoolCode: "7010208" },
        { date: FRI, eventName: "체육대회", eventType: "학사일정", schoolCode: "7010208" },
      ],
    });

    const after = await t.query(api.schedule.getEventsInRange, { start: THU, end: "20260831" });
    const flagged = after.filter((e) => e.dday === true).map((e) => e.title).sort();
    expect(flagged).toEqual(["반티 주문", "중간고사"]);
    // The sync really did replace the rows rather than skip them.
    expect(after.filter((e) => e.source === "school")).toHaveLength(2);
  });

  test("a renamed school event does not inherit the old one's D-day", async () => {
    const t = await withSchedule([
      { date: NEXT_MON, title: "중간고사", eventType: "학사일정", dday: true },
    ]);
    await t.mutation(internal.schedule.upsertManySchoolEvents, {
      startdate: THU,
      enddate: "20260831",
      events: [
        { date: NEXT_MON, eventName: "1차 지필평가", eventType: "학사일정", schoolCode: "7010208" },
      ],
    });
    const after = await t.query(api.schedule.getEventsInRange, { start: THU, end: "20260831" });
    expect(after.map((e) => e.title)).toEqual(["1차 지필평가"]);
    expect(after[0]?.dday).toBeUndefined();
  });
});
