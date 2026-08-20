/// <reference types="vite/client" />
import { describe, expect, test } from "vitest";
import { convexTest } from "convex-test";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.*s");

const TOKEN = "test-admin-token";

type SeedSlot = {
  period: number;
  subject: string;
  teacher: string;
  replaced?: boolean;
  original?: { period: number; subject: string; teacher: string };
};

function slot(period: number, subject: string, teacher: string): SeedSlot {
  return { period, subject, teacher };
}

// A logged-in admin plus, optionally, a fetched week to snapshot from.
async function withAdmin(week?: { week: 0 | 1; timetable: SeedSlot[][]; day_time?: string[] }) {
  const t = convexTest(schema, modules);
  await t.run(async (ctx) => {
    const now = Date.now();
    await ctx.db.insert("sessions", {
      token: TOKEN,
      createdAt: now,
      expiresAt: now + 60_000,
    });
    if (week) {
      await ctx.db.insert("timetables", {
        week: week.week,
        day_time: week.day_time ?? [],
        timetable: week.timetable.map((day) =>
          day.map((s) => ({
            period: s.period,
            subject: s.subject,
            teacher: s.teacher,
            replaced: s.replaced ?? false,
            original: s.original ?? null,
          })),
        ),
        update_date: "20260820",
        editedAt: now,
      });
    }
  });
  return t;
}

const subjects = (days: { subject: string }[][]) => days.map((day) => day.map((s) => s.subject));

describe("timetable.getFull", () => {
  test("is null before anything is stored", async () => {
    const t = await withAdmin();
    expect(await t.query(api.timetable.getFull, {})).toBeNull();
  });
});

describe("timetable.snapshotFull", () => {
  test("copies a fetched week as five days, keeping each day's own length", async () => {
    const t = await withAdmin({
      week: 0,
      day_time: ["1교시(08:40~09:30)", "2교시(09:40~10:30)"],
      timetable: [
        [slot(1, "국어", "김"), slot(2, "수학", "이")],
        [slot(1, "영어", "박")],
        [],
        [slot(1, "과학", "최")],
        [slot(1, "체육", "정")],
      ],
    });
    await t.mutation(api.timetable.snapshotFull, { sessionToken: TOKEN, week: 0 });

    const full = await t.query(api.timetable.getFull, {});
    expect(full).not.toBeNull();
    expect(subjects(full!.timetable)).toEqual([
      ["국어", "수학"],
      ["영어"],
      [],
      ["과학"],
      ["체육"],
    ]);
    expect(full!.day_time).toEqual(["1교시(08:40~09:30)", "2교시(09:40~10:30)"]);
  });

  // The standing timetable is what a substitution is measured *against*, so a
  // week snapshotted mid-substitution must record the class that was replaced.
  test("records the original class, not the one that replaced it", async () => {
    const t = await withAdmin({
      week: 0,
      timetable: [
        [
          {
            period: 1,
            subject: "자습",
            teacher: "담임",
            replaced: true,
            original: { period: 1, subject: "국어", teacher: "김" },
          },
        ],
        [],
        [],
        [],
        [],
      ],
    });
    await t.mutation(api.timetable.snapshotFull, { sessionToken: TOKEN, week: 0 });

    const full = await t.query(api.timetable.getFull, {});
    expect(full!.timetable[0]).toEqual([{ subject: "국어", teacher: "김" }]);
  });

  test("a second snapshot replaces the first rather than appending to it", async () => {
    const t = await withAdmin({ week: 0, timetable: [[slot(1, "국어", "김")], [], [], [], []] });
    await t.mutation(api.timetable.snapshotFull, { sessionToken: TOKEN, week: 0 });
    await t.run(async (ctx) => {
      const row = await ctx.db.query("timetables").first();
      await ctx.db.patch(row!._id, {
        timetable: [[{ period: 1, subject: "수학", teacher: "이", replaced: false, original: null }], [], [], [], []],
      });
    });
    await t.mutation(api.timetable.snapshotFull, { sessionToken: TOKEN, week: 0 });

    const rows = await t.run((ctx) => ctx.db.query("fullTimetable").collect());
    expect(rows).toHaveLength(1);
    expect(subjects((await t.query(api.timetable.getFull, {}))!.timetable)[0]).toEqual(["수학"]);
  });

  test("refuses a week that has no fetched timetable", async () => {
    const t = await withAdmin();
    await expect(
      t.mutation(api.timetable.snapshotFull, { sessionToken: TOKEN, week: 1 }),
    ).rejects.toThrow(/snapshot/);
  });

  test("refuses an unauthenticated caller", async () => {
    const t = await withAdmin({ week: 0, timetable: [[slot(1, "국어", "김")], [], [], [], []] });
    await expect(
      t.mutation(api.timetable.snapshotFull, { sessionToken: "nope", week: 0 }),
    ).rejects.toThrow(/Unauthorized/);
    expect(await t.query(api.timetable.getFull, {})).toBeNull();
  });
});

describe("timetable.setFullSlot", () => {
  test("builds a standing timetable from nothing", async () => {
    const t = await withAdmin();
    await t.mutation(api.timetable.setFullSlot, {
      sessionToken: TOKEN,
      day: 2,
      period: 1,
      subject: "미술",
      teacher: "한",
    });
    const full = await t.query(api.timetable.getFull, {});
    expect(full!.timetable).toEqual([[], [], [{ subject: "미술", teacher: "한" }], [], []]);
  });

  test("editing past the end of a day fills the gap with blanks", async () => {
    const t = await withAdmin();
    await t.mutation(api.timetable.setFullSlot, {
      sessionToken: TOKEN,
      day: 0,
      period: 3,
      subject: "음악",
      teacher: "서",
    });
    const full = await t.query(api.timetable.getFull, {});
    expect(full!.timetable[0]).toEqual([
      { subject: "", teacher: "" },
      { subject: "", teacher: "" },
      { subject: "음악", teacher: "서" },
    ]);
  });

  test("trims whitespace and rejects an out-of-range cell", async () => {
    const t = await withAdmin();
    await t.mutation(api.timetable.setFullSlot, {
      sessionToken: TOKEN,
      day: 0,
      period: 1,
      subject: "  수학  ",
      teacher: " 이 ",
    });
    expect((await t.query(api.timetable.getFull, {}))!.timetable[0]).toEqual([
      { subject: "수학", teacher: "이" },
    ]);

    const bad = { sessionToken: TOKEN, subject: "x", teacher: "y" };
    await expect(t.mutation(api.timetable.setFullSlot, { ...bad, day: 5, period: 1 })).rejects.toThrow(/day/);
    await expect(t.mutation(api.timetable.setFullSlot, { ...bad, day: 0, period: 0 })).rejects.toThrow(/period/);
    await expect(t.mutation(api.timetable.setFullSlot, { ...bad, day: 0, period: 13 })).rejects.toThrow(/period/);
  });
});

describe("timetable.setFullDayLength", () => {
  test("truncates and extends one day without touching the others", async () => {
    const t = await withAdmin({
      week: 0,
      timetable: [
        [slot(1, "국어", "김"), slot(2, "수학", "이"), slot(3, "영어", "박")],
        [slot(1, "과학", "최")],
        [],
        [],
        [],
      ],
    });
    await t.mutation(api.timetable.snapshotFull, { sessionToken: TOKEN, week: 0 });

    await t.mutation(api.timetable.setFullDayLength, { sessionToken: TOKEN, day: 0, length: 2 });
    expect(subjects((await t.query(api.timetable.getFull, {}))!.timetable)).toEqual([
      ["국어", "수학"],
      ["과학"],
      [],
      [],
      [],
    ]);

    await t.mutation(api.timetable.setFullDayLength, { sessionToken: TOKEN, day: 0, length: 3 });
    // The dropped period is gone, not remembered — the new one comes back blank.
    expect(subjects((await t.query(api.timetable.getFull, {}))!.timetable)[0]).toEqual([
      "국어",
      "수학",
      "",
    ]);
  });

  test("rejects a length outside the grid", async () => {
    const t = await withAdmin();
    await expect(
      t.mutation(api.timetable.setFullDayLength, { sessionToken: TOKEN, day: 0, length: 13 }),
    ).rejects.toThrow(/length/);
    await expect(
      t.mutation(api.timetable.setFullDayLength, { sessionToken: TOKEN, day: 0, length: -1 }),
    ).rejects.toThrow(/length/);
  });
});
