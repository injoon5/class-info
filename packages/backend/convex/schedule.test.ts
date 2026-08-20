/// <reference types="vite/client" />
import { describe, expect, test } from "vitest";
import { convexTest } from "convex-test";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.*s");

const THU = "20260820";
const FRI = "20260821";
const SAT = "20260822";
const NEXT_MON = "20260824";

type Seed = { date: string; title: string; eventType?: string; source?: "school" | "custom" };

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
