/// <reference types="vite/client" />
import { afterEach, describe, expect, test, vi } from "vitest";
import { convexTest } from "convex-test";
import { api, internal } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.*s");

const ARGS = { grade: 1, classno: 3, week: 0 as const, schoolcode: "7010208" };

type Slot = {
  period: number;
  subject: string;
  teacher: string;
  replaced: boolean;
  original: null | { period: number; subject: string; teacher: string };
};

function slot(period: number, subject: string, teacher = ""): Slot {
  return { period, subject, teacher, replaced: false, original: null };
}

// Comcigan's answer: bell times, teachers, and a replacement marker.
const COMCIGAN = {
  day_time: ["1(08:10)", "2(09:10)", "3(10:10)"],
  timetable: [
    [
      { ...slot(1, "체육", "임한*"), replaced: true, original: { period: 1, subject: "공국", teacher: "신영*" } },
      slot(2, "공국", "신영*"),
    ],
    [slot(1, "탐실", "권유*")],
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
    [slot(1, "체육"), slot(2, "공통국어")],
    [slot(1, "과학탐구실험")],
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
  test("asks for the merged grid by default rather than trusting the API's default", async () => {
    const t = convexTest(schema, modules);
    const urls = stubFetch(jsonResponse(COMCIGAN));
    await t.action(internal.timetable.fetchAndSave, ARGS);
    expect(urls[0]).toContain("source=auto");
    expect(urls[0]).toContain("schoolcode=7010208");
  });

  test("pins Comcigan when asked for it", async () => {
    const t = convexTest(schema, modules);
    const urls = stubFetch(jsonResponse(COMCIGAN));
    await t.action(internal.timetable.fetchAndSave, { ...ARGS, source: "comcigan" });
    expect(urls[0]).toContain("source=comcigan");
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
        timetable: [[slot(2, "공통수학"), slot(4, "통합사회")], [], [], [], []],
      })
    );

    await t.action(internal.timetable.fetchAndSave, ARGS);

    const stored = await t.query(api.timetable.getByWeek, { week: 0 });
    expect(stored!.timetable[0]!.map((s) => s.period)).toEqual([2, 4]);
  });
});

describe("timetable.fetchAndSave — errors", () => {
  test("treats an empty week as nothing to store, not a failure", async () => {
    const t = convexTest(schema, modules);
    await seedWeek(t, 0);
    stubFetch(apiError("NEIS_DATA_NOT_FOUND", 404, "No timetable rows for this week."));

    await expect(t.action(internal.timetable.fetchAndSave, ARGS)).resolves.toBeNull();

    // A 방학 must not blank a week the app is still showing.
    const stored = await t.query(api.timetable.getByWeek, { week: 0 });
    expect(stored!.timetable.flat()).toHaveLength(3);
  });

  test("surfaces the error code for a school neither source knows", async () => {
    const t = convexTest(schema, modules);
    stubFetch(apiError("TIMETABLE_SCHOOL_NOT_FOUND", 404, "No school matched."));
    await expect(
      t.action(internal.timetable.fetchAndSave, { ...ARGS, schoolcode: "7531146" })
    ).rejects.toThrow(/TIMETABLE_SCHOOL_NOT_FOUND/);
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
        timetable: [[slot(1, "체육", "임한*"), null, { period: 0 }, "nope"], "bad", [], [], []],
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
