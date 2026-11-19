/// <reference types="vite/client" />
import { describe, expect, test } from "vitest";
import { convexTest } from "convex-test";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.*s");
const TOKEN = "test-admin-token";
const THU = { today: "20260820", afterRollover: false };

async function withNotices(dueDates: string[]) {
  const t = convexTest(schema, modules);
  await t.run(async (ctx) => {
    await ctx.db.insert("sessions", { token: TOKEN, createdAt: 0, expiresAt: Date.now() + 60_000 });
    for (const dueDate of dueDates) {
      await ctx.db.insert("notices", {
        title: `due ${dueDate}`,
        subject: "국어",
        type: "숙제",
        description: "",
        dueDate,
        createdAt: 0,
        updatedAt: 0,
      });
    }
  });
  return t;
}

describe("notices.overview", () => {
  test("groups current notices by day, labelled against today", async () => {
    const t = await withNotices(["2026-08-24", "2026-08-20", "2026-08-21", "2026-08-19"]);
    const { currentGroups } = await t.query(api.notices.overview, THU);
    expect(currentGroups.map((g) => [g.date, g.displayDate, g.isToday])).toEqual([
      ["2026-08-20", "오늘", true],
      ["2026-08-21", "내일", false],
      ["2026-08-24", "8/24 (월)", false],
    ]);
  });

  test("today's notices turn past at the rollover", async () => {
    const t = await withNotices(["2026-08-20", "2026-08-21"]);
    const { currentGroups, pastMonths } = await t.query(api.notices.overview, { ...THU, afterRollover: true });
    expect(currentGroups.map((g) => g.date)).toEqual(["2026-08-21"]);
    expect(pastMonths).toEqual([{ monthKey: "2026-08", monthName: "2026년 8월", total: 1 }]);
  });

  test("past months are newest first, and each opens to its own notices", async () => {
    const t = await withNotices(["2026-06-30", "2026-07-01", "2026-07-31", "2026-08-03"]);
    const { pastMonths } = await t.query(api.notices.overview, THU);
    expect(pastMonths.map((m) => [m.monthKey, m.total])).toEqual([
      ["2026-08", 1],
      ["2026-07", 2],
      ["2026-06", 1],
    ]);
    const july = await t.query(api.notices.pastByMonth, { monthKey: "2026-07", ...THU });
    expect(july.map((g) => g.date)).toEqual(["2026-07-01", "2026-07-31"]);
  });
});

describe("notice writes", () => {
  const fields = { title: " 제목 ", subject: "수학", type: "숙제" as const, description: "본문", dueDate: "2026-08-21" };

  test("create trims, assigns a slug, and the notice opens by it", async () => {
    const t = await withNotices([]);
    await t.mutation(api.notices.create, { sessionToken: TOKEN, ...fields });
    const [group] = await t.query(api.notices.currentGroups, THU);
    const notice = group!.notices[0]!;
    expect(notice.title).toBe("제목");
    expect(notice.slug).toMatch(/^[a-z]{5}$/);
    expect((await t.query(api.notices.detail, { id: notice.slug! })).notice?._id).toBe(notice._id);
  });

  test("update without a slug keeps the existing one", async () => {
    const t = await withNotices([]);
    const id = await t.mutation(api.notices.create, { sessionToken: TOKEN, ...fields, slug: "math-hw" });
    await t.mutation(api.notices.update, { sessionToken: TOKEN, id, ...fields, title: "새 제목" });
    const { notice } = await t.query(api.notices.detail, { id: "math-hw" });
    expect(notice?.title).toBe("새 제목");
  });

  test("rejects a due date that isn't a real day", async () => {
    const t = await withNotices([]);
    await expect(
      t.mutation(api.notices.create, { sessionToken: TOKEN, ...fields, dueDate: "2026-02-30" })
    ).rejects.toThrow(/dueDate/);
  });

  test("refuses a caller without a live session", async () => {
    const t = await withNotices([]);
    await expect(t.mutation(api.notices.create, { sessionToken: "nope", ...fields })).rejects.toThrow(
      /Unauthorized/
    );
  });
});
