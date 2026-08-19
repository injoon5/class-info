import { v } from "convex/values";
import { internalMutation, mutation, query, type QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { requireAdmin } from "./auth";
import { deleteFilesByIds } from "./files";
import {
  addDaysIso,
  assertIsoDate,
  parseIsoDate,
  weekdayKrUtc,
} from "./dates";
import {
  dayGroup,
  monthSummary,
  noticeClockArgs,
  noticeDoc,
  noticeType,
  fileDoc,
  type DayGroup,
  type MinimalNotice,
  type MonthSummary,
} from "./validators";

const TITLE_MAX = 200;
const SUBJECT_MAX = 80;
const DESCRIPTION_MAX = 100_000;
const SLUG_MAX = 48;
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const FILES_MAX = 16;
const DETAIL_ID_MAX = 128;
const SLUG_ATTEMPTS = 8;

const noticeFields = {
  title: v.string(),
  subject: v.string(),
  type: noticeType,
  description: v.string(),
  dueDate: v.string(),
  files: v.optional(v.array(v.id("files"))),
  slug: v.optional(v.string()),
};

function assertLength(value: string, max: number, field: string): void {
  if (value.length === 0) throw new Error(`${field} is required`);
  if (value.length > max) throw new Error(`${field} is too long`);
}

function normalizeSlug(slug: string | undefined): string | undefined {
  if (slug === undefined) return undefined;
  const trimmed = slug.trim().toLowerCase();
  return trimmed.length > 0 ? trimmed : "";
}

function assertSlugShape(slug: string): void {
  if (slug.length > SLUG_MAX || !SLUG_RE.test(slug)) {
    throw new Error("Invalid slug; use lowercase letters, numbers, and hyphens");
  }
}

function assertNoticeWrite(fields: {
  title: string;
  subject: string;
  description: string;
  dueDate: string;
}): void {
  assertLength(fields.title.trim(), TITLE_MAX, "title");
  assertLength(fields.subject.trim(), SUBJECT_MAX, "subject");
  if (fields.description.length > DESCRIPTION_MAX) {
    throw new Error("description is too long");
  }
  assertIsoDate(fields.dueDate, "dueDate");
}

// ── Slugs ─────────────────────────────────────────────────────────────────────

function generateRandomSlug(): string {
  const bytes = new Uint8Array(5);
  crypto.getRandomValues(bytes);
  let slug = "";
  for (const b of bytes) slug += String.fromCharCode(97 + (b % 26));
  return slug;
}

// A slug is "taken" only if another notice (never the one being updated) uses it.
async function isSlugTaken(ctx: QueryCtx, slug: string, excludeId?: Id<"notices">): Promise<boolean> {
  if (!slug) return false;
  const hit = await ctx.db
    .query("notices")
    .withIndex("by_slug", (q) => q.eq("slug", slug))
    .first();
  return Boolean(hit && hit._id !== excludeId);
}

async function createUniqueSlug(ctx: QueryCtx, excludeId?: Id<"notices">): Promise<string> {
  for (let attempt = 0; attempt < SLUG_ATTEMPTS; attempt++) {
    const slug = generateRandomSlug();
    if (!(await isSlugTaken(ctx, slug, excludeId))) return slug;
  }
  throw new Error("Could not allocate a unique slug");
}

async function assertExistingFileIds(ctx: QueryCtx, fileIds: Id<"files">[] | undefined): Promise<Id<"files">[] | undefined> {
  if (fileIds === undefined) return undefined;
  const unique = [...new Set(fileIds)];
  if (unique.length > FILES_MAX) throw new Error("Too many files");
  for (const fileId of unique) {
    const file = await ctx.db.get(fileId);
    if (!file) throw new Error("File not found");
  }
  return unique;
}

async function resolveNewSlug(
  ctx: QueryCtx,
  requested: string | undefined,
  excludeId?: Id<"notices">
): Promise<string> {
  const normalized = normalizeSlug(requested);
  if (!normalized) return await createUniqueSlug(ctx, excludeId);
  assertSlugShape(normalized);
  if (await isSlugTaken(ctx, normalized, excludeId)) {
    throw new Error("Slug already in use");
  }
  return normalized;
}

// ── Notice → minimal projection ────────────────────────────────────────────────

function getUrlBasename(url: string): string {
  const withoutQuery = url.split("?")[0].split("#")[0];
  const parts = withoutQuery.split("/");
  return parts[parts.length - 1] || url;
}

function summarizeDescription(description: string): string {
  let firstLine = description.split("\n")[0] || "";
  firstLine = firstLine.replace(/^#+\s*/, "");
  return firstLine.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_m, alt, link) => {
    const trimmedAlt = String(alt || "").trim();
    if (trimmedAlt.length > 0) return trimmedAlt;
    return getUrlBasename(String(link || "").trim());
  });
}

function toMinimalNotice(n: Doc<"notices">): MinimalNotice {
  return {
    _id: n._id,
    title: n.title,
    subject: n.subject,
    type: n.type,
    dueDate: n.dueDate,
    updatedAt: n.updatedAt,
    createdAt: n.createdAt,
    hasFiles: Array.isArray(n.files) && n.files.length > 0,
    summary: typeof n.description === "string" ? summarizeDescription(n.description) : "",
    slug: typeof n.slug === "string" ? n.slug : undefined,
  };
}

// ── Grouping (shared by currentGroups / pastByMonth / overview) ─────────────────

function toDisplayDate(dueDate: string, today: string): { displayDate: string; isToday: boolean } {
  if (dueDate === today) return { displayDate: "오늘", isToday: true };
  if (dueDate === addDaysIso(today, 1)) return { displayDate: "내일", isToday: false };
  const parsed = parseIsoDate(dueDate);
  if (!parsed) return { displayDate: dueDate, isToday: false };
  return {
    displayDate: `${parsed.m}/${parsed.d} (${weekdayKrUtc(parsed.y, parsed.m, parsed.d)})`,
    isToday: false,
  };
}

function groupByDay(rows: Doc<"notices">[], today: string): DayGroup[] {
  const groups = new Map<string, DayGroup>();
  for (const n of rows) {
    const key = n.dueDate;
    if (!groups.has(key)) {
      const { displayDate, isToday } = toDisplayDate(n.dueDate, today);
      groups.set(key, { date: key, displayDate, isToday, notices: [] });
    }
    groups.get(key)!.notices.push(toMinimalNotice(n));
  }
  return Array.from(groups.values()).sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

function summarizeMonths(rows: Doc<"notices">[]): MonthSummary[] {
  const monthMap = new Map<string, MonthSummary>();
  for (const n of rows) {
    const parsed = parseIsoDate(n.dueDate);
    if (!parsed) continue;
    // monthKey stays 0-indexed to match existing clients (`2026-7` = August).
    const key = `${parsed.y}-${parsed.m - 1}`;
    if (!monthMap.has(key)) {
      monthMap.set(key, {
        monthKey: key,
        monthName: `${parsed.y}년 ${parsed.m}월`,
        total: 0,
      });
    }
    monthMap.get(key)!.total += 1;
  }
  return Array.from(monthMap.values()).sort((a, b) => {
    const [ay, am] = a.monthKey.split("-").map(Number);
    const [by, bm] = b.monthKey.split("-").map(Number);
    return (by ?? 0) - (ay ?? 0) || (bm ?? 0) - (am ?? 0);
  });
}

function parseMonthKey(monthKey: string): { year: number; monthIndex: number } | null {
  const parts = monthKey.split("-");
  if (parts.length !== 2) return null;
  const year = Number(parts[0]);
  const monthIndex = Number(parts[1]);
  if (!Number.isInteger(year) || !Number.isInteger(monthIndex)) return null;
  if (monthIndex < 0 || monthIndex > 11) return null;
  return { year, monthIndex };
}

function assertClock(cutoff: string, today: string): void {
  assertIsoDate(cutoff, "cutoff");
  assertIsoDate(today, "today");
}

// ── Queries ─────────────────────────────────────────────────────────────────────

export const currentGroups = query({
  args: noticeClockArgs,
  returns: v.array(dayGroup),
  handler: async (ctx, { cutoff, today }) => {
    assertClock(cutoff, today);
    const rows = await ctx.db
      .query("notices")
      .withIndex("by_due_date", (q) => q.gte("dueDate", cutoff))
      .collect();
    return groupByDay(rows, today);
  },
});

export const pastByMonth = query({
  args: { monthKey: v.string(), cutoff: v.string(), today: v.string() },
  returns: v.array(dayGroup),
  handler: async (ctx, { monthKey, cutoff, today }) => {
    assertClock(cutoff, today);
    const parsed = parseMonthKey(monthKey);
    if (!parsed) return [];
    const monthStart = `${parsed.year}-${String(parsed.monthIndex + 1).padStart(2, "0")}-01`;
    const next = parsed.monthIndex === 11
      ? `${parsed.year + 1}-01-01`
      : `${parsed.year}-${String(parsed.monthIndex + 2).padStart(2, "0")}-01`;
    const upper = next < cutoff ? next : cutoff;
    if (monthStart >= upper) return [];
    const rows = await ctx.db
      .query("notices")
      .withIndex("by_due_date", (q) => q.gte("dueDate", monthStart).lt("dueDate", upper))
      .collect();
    return groupByDay(rows, today);
  },
});

export const overview = query({
  args: noticeClockArgs,
  returns: v.object({
    currentGroups: v.array(dayGroup),
    pastMonths: v.array(monthSummary),
  }),
  handler: async (ctx, { cutoff, today }) => {
    assertClock(cutoff, today);
    const [currentRows, pastRows] = await Promise.all([
      ctx.db.query("notices").withIndex("by_due_date", (q) => q.gte("dueDate", cutoff)).collect(),
      ctx.db.query("notices").withIndex("by_due_date", (q) => q.lt("dueDate", cutoff)).collect(),
    ]);
    return {
      currentGroups: groupByDay(currentRows, today),
      pastMonths: summarizeMonths(pastRows),
    };
  },
});

export const detail = query({
  args: { id: v.string() },
  returns: v.object({
    notice: v.union(noticeDoc, v.null()),
    files: v.array(fileDoc),
  }),
  handler: async (ctx, { id }) => {
    if (id.length === 0 || id.length > DETAIL_ID_MAX) {
      return { notice: null, files: [] as Doc<"files">[] };
    }
    let notice = await ctx.db
      .query("notices")
      .withIndex("by_slug", (q) => q.eq("slug", id))
      .first();

    if (!notice) {
      const normalizedId = ctx.db.normalizeId("notices", id);
      notice = normalizedId ? await ctx.db.get(normalizedId) : null;
    }

    if (!notice) return { notice: null, files: [] as Doc<"files">[] };

    const files = Array.isArray(notice.files)
      ? (await Promise.all(notice.files.map((fid) => ctx.db.get(fid)))).filter(
          (f): f is Doc<"files"> => f !== null
        )
      : [];
    return { notice, files };
  },
});

// ── Mutations ────────────────────────────────────────────────────────────────

export const create = mutation({
  args: { sessionToken: v.string(), ...noticeFields },
  returns: v.id("notices"),
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.sessionToken);
    const { sessionToken: _t, ...fields } = args;
    const title = fields.title.trim();
    const subject = fields.subject.trim();
    assertNoticeWrite({ ...fields, title, subject });
    const files = await assertExistingFileIds(ctx, fields.files);
    const now = Date.now();
    const slug = await resolveNewSlug(ctx, fields.slug);
    return await ctx.db.insert("notices", {
      ...fields,
      title,
      subject,
      ...(files !== undefined ? { files } : {}),
      slug,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const update = mutation({
  args: { sessionToken: v.string(), id: v.id("notices"), ...noticeFields },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.sessionToken);
    const existing = await ctx.db.get(args.id);
    if (!existing) throw new Error("Notice not found");
    const { sessionToken: _t, id, slug, ...updates } = args;
    const title = updates.title.trim();
    const subject = updates.subject.trim();
    assertNoticeWrite({ ...updates, title, subject });
    const files = await assertExistingFileIds(ctx, updates.files);
    const patch: Partial<Doc<"notices">> = {
      ...updates,
      title,
      subject,
      ...(files !== undefined ? { files } : {}),
      updatedAt: Date.now(),
    };
    if (slug !== undefined) {
      patch.slug = await resolveNewSlug(ctx, slug, id);
    }
    await ctx.db.patch(id, patch);
    return null;
  },
});

export const remove = mutation({
  args: { sessionToken: v.string(), id: v.id("notices") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.sessionToken);
    const notice = await ctx.db.get(args.id);
    if (!notice) return null;
    // Cascade: remove attached file records + their R2 objects so nothing leaks.
    if (Array.isArray(notice.files) && notice.files.length > 0) {
      await deleteFilesByIds(ctx, notice.files);
    }
    await ctx.db.delete(args.id);
    return null;
  },
});

// Backfill slugs for existing notices that don't have one.
// Internal-only: run via the Convex dashboard, never exposed to clients.
export const backfillMissingSlugs = internalMutation({
  args: {},
  returns: v.object({
    updated: v.number(),
    results: v.array(v.object({ id: v.string(), slug: v.string() })),
  }),
  handler: async (ctx) => {
    const all = await ctx.db.query("notices").collect();
    let updated = 0;
    const results: { id: string; slug: string }[] = [];
    for (const n of all) {
      const hasValidSlug = typeof n.slug === "string" && n.slug.trim().length > 0;
      if (!hasValidSlug) {
        const slug = await createUniqueSlug(ctx);
        await ctx.db.patch(n._id, { slug, updatedAt: Date.now() });
        updated += 1;
        results.push({ id: String(n._id), slug });
      }
    }
    return { updated, results };
  },
});
