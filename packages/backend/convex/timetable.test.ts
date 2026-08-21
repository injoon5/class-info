/// <reference types="vite/client" />
import { afterEach, describe, expect, test, vi } from "vitest";
import { convexTest } from "convex-test";
import { api, internal } from "./_generated/api";
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

// ── Fetched weeks ────────────────────────────────────────────────────────────

const ARGS = { grade: 1, classno: 3, week: 0 as const, schoolcode: "7010208" };

type FetchedSlot = {
  period: number;
  subject: string;
  teacher: string;
  replaced: boolean;
  original: null | { period: number; subject: string; teacher: string };
};

function fetched(period: number, subject: string, teacher = ""): FetchedSlot {
  return { period, subject, teacher, replaced: false, original: null };
}

// Comcigan's answer: bell times, teachers, and a replacement marker.
const COMCIGAN = {
  day_time: ["1(08:10)", "2(09:10)", "3(10:10)"],
  timetable: [
    [
      { ...slot(1, "체육", "임한*"), replaced: true, original: { period: 1, subject: "공국", teacher: "신영*" } },
      fetched(2, "공국", "신영*"),
    ],
    [fetched(1, "탐실", "권유*")],
    [],
    [],
    [],
  ],
  update_date: "2026-08-20 12:10:13",
};

// NEIS's answer for the same week: same keys, emptied out. No bell times, no
// teachers, no LOAD_DTM, nothing replaced, and never an `original`.
const NEIS_ONLY = {
  day_time: [],
  timetable: [
    [fetched(1, "체육"), fetched(2, "공통국어")],
    [fetched(1, "과학탐구실험")],
    [],
    [],
    [],
  ],
  update_date: "",
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function apiError(code: string, status: number, message = "boom"): Response {
  return jsonResponse({ ok: false, error: { code, message, details: { source: "auto" } } }, status);
}

// Captures every request the action makes so the query string can be asserted.
function stubFetch(...responses: Array<Response | (() => Response)>): string[] {
  const urls: string[] = [];
  let call = 0;
  vi.stubGlobal("fetch", (input: string | URL) => {
    urls.push(String(input));
    const next = responses[Math.min(call++, responses.length - 1)]!;
    return Promise.resolve(typeof next === "function" ? next() : next.clone());
  });
  return urls;
}

async function seedWeek(t: ReturnType<typeof convexTest>, week: number) {
  await t.run(async (ctx) => {
    await ctx.db.insert("timetables", {
      week,
      day_time: COMCIGAN.day_time,
      timetable: COMCIGAN.timetable,
      update_date: COMCIGAN.update_date,
      editedAt: Date.now(),
    });
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("timetable.fetchAndSave — source", () => {
  test("always asks for the merged grid rather than trusting the API's default", async () => {
    const t = convexTest(schema, modules);
    const urls = stubFetch(jsonResponse(COMCIGAN));
    await t.action(internal.timetable.fetchAndSave, ARGS);
    expect(urls[0]).toContain("source=auto");
    expect(urls[0]).toContain("schoolcode=7010208");
  });
});

describe("timetable.fetchAndSave — NEIS-only weeks", () => {
  test("stores a week with no bell times, teachers, or LOAD_DTM", async () => {
    const t = convexTest(schema, modules);
    stubFetch(jsonResponse(NEIS_ONLY));

    await t.action(internal.timetable.fetchAndSave, ARGS);

    const stored = await t.query(api.timetable.getByWeek, { week: 0 });
    expect(stored).not.toBeNull();
    expect(stored!.day_time).toEqual([]);
    expect(stored!.update_date).toBe("");
    const slots = stored!.timetable.flat();
    expect(slots).toHaveLength(3);
    expect(slots.every((s) => s.teacher === "")).toBe(true);
    expect(slots.every((s) => s.replaced === false)).toBe(true);
    expect(slots.every((s) => s.original === null)).toBe(true);
  });

  test("keeps periods addressable by 교시 when a day starts late", async () => {
    const t = convexTest(schema, modules);
    stubFetch(
      jsonResponse({
        ...NEIS_ONLY,
        timetable: [[fetched(2, "공통수학"), fetched(4, "통합사회")], [], [], [], []],
      })
    );

    await t.action(internal.timetable.fetchAndSave, ARGS);

    const stored = await t.query(api.timetable.getByWeek, { week: 0 });
    expect(stored!.timetable[0]!.map((s) => s.period)).toEqual([2, 4]);
  });
});

describe("timetable.fetchAndSave — errors", () => {
  // 외대부고 (7531146) answers this way year-round: valid in NEIS, but it
  // publishes no timetable to either source. A 방학 looks identical.
  test("treats an empty week as nothing to store, not a failure", async () => {
    const t = convexTest(schema, modules);
    await seedWeek(t, 0);
    stubFetch(apiError("NEIS_DATA_NOT_FOUND", 404, "No timetable rows for this week."));

    await expect(t.action(internal.timetable.fetchAndSave, ARGS)).resolves.toBeNull();

    // A 방학 must not blank a week the app is still showing.
    const stored = await t.query(api.timetable.getByWeek, { week: 0 });
    expect(stored!.timetable.flat()).toHaveLength(3);
  });

  test("surfaces the error code when the school itself does not resolve", async () => {
    const t = convexTest(schema, modules);
    stubFetch(apiError("TIMETABLE_SCHOOL_NOT_FOUND", 404, "No school matched this name."));
    await expect(t.action(internal.timetable.fetchAndSave, ARGS)).rejects.toThrow(
      /TIMETABLE_SCHOOL_NOT_FOUND/
    );
  });

  test("surfaces a NEIS upstream failure as a 502", async () => {
    const t = convexTest(schema, modules);
    stubFetch(apiError("NEIS_UPSTREAM_ERROR", 502, "NEIS request failed."));
    await expect(t.action(internal.timetable.fetchAndSave, ARGS)).rejects.toThrow(
      /502 NEIS_UPSTREAM_ERROR/
    );
  });

  test("still reports a failure that carries no error envelope", async () => {
    const t = convexTest(schema, modules);
    stubFetch(() => new Response("<html>502</html>", { status: 502 }));
    await expect(t.action(internal.timetable.fetchAndSave, ARGS)).rejects.toThrow(/502/);
  });

  test("keeps the stored week when the grid comes back empty", async () => {
    const t = convexTest(schema, modules);
    await seedWeek(t, 0);
    stubFetch(jsonResponse({ day_time: [], timetable: [[], [], [], [], []], update_date: "" }));

    await expect(t.action(internal.timetable.fetchAndSave, ARGS)).resolves.toBeNull();

    const stored = await t.query(api.timetable.getByWeek, { week: 0 });
    expect(stored!.day_time).toEqual(COMCIGAN.day_time);
    expect(stored!.timetable.flat()).toHaveLength(3);
  });

  test("rejects a payload that is not a timetable at all", async () => {
    const t = convexTest(schema, modules);
    stubFetch(jsonResponse({ day_time: "08:10", timetable: null }));
    await expect(t.action(internal.timetable.fetchAndSave, ARGS)).rejects.toThrow(/payload shape/);
  });

  test("drops junk slots instead of failing the write", async () => {
    const t = convexTest(schema, modules);
    stubFetch(
      jsonResponse({
        day_time: ["1(08:10)", 42],
        timetable: [[fetched(1, "체육", "임한*"), null, { period: 0 }, "nope"], "bad", [], [], []],
        update_date: null,
      })
    );

    await t.action(internal.timetable.fetchAndSave, ARGS);

    const stored = await t.query(api.timetable.getByWeek, { week: 0 });
    expect(stored!.day_time).toEqual(["1(08:10)"]);
    expect(stored!.update_date).toBe("");
    expect(stored!.timetable[0]!.map((s) => s.subject)).toEqual(["체육"]);
    expect(stored!.timetable[1]).toEqual([]);
  });
});
