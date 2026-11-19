import { ConvexError, v, type Infer } from "convex/values";
import { query, type QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { adminMutation } from "./auth";
import { summarizeDescription } from "./text";
import { projectFile } from "./files";
import { assertYmd, dayLabel, noticeCutoff, ymdFromIso, type SchoolClock } from "./dates";
import {
  MAX_ATTACHMENTS,
  dayGroup,
  monthSummary,
  noticeDoc,
  noticeType,
  publicFile,
  schoolClockArgs,
  type DayGroup,
  type MinimalNotice,
  type MonthSummary,
  type PublicFile,
} from "./validators";

const TITLE_MAX = 200;
const SUBJECT_MAX = 80;
const DESCRIPTION_MAX = 100_000;
const SLUG_MAX = 48;
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DETAIL_ID_MAX = 128;
const SLUG_ATTEMPTS = 8;

const editableFields = {
  title: v.string(),
  subject: v.string(),
  type: noticeType,
  description: v.string(),
  dueDate: v.string(),
  files: v.optional(v.array(v.id("files"))),
  slug: v.optional(v.string()),
};
const editable = v.object(editableFields);
type EditableFields = Infer<typeof editable>;

// ── Writes ───────────────────────────────────────────────────────────────

// Messages are ConvexErrors in Korean: they reach the admin editor as-is,
// where a plain Error would be redacted to "Server Error" in production.
function assertLength(value: string, max: number, label: string): void {
  if (value.length === 0) throw new ConvexError(`${label}을 입력해 주세요.`);
  if (value.length > max) throw new ConvexError(`${label}이 너무 길어요. ${max}자 이하로 줄여 주세요.`);
}

function randomSlug(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(5));
  return Array.from(bytes, (b) => String.fromCharCode(97 + (b % 26))).join("");
}

// A slug is "taken" only if another notice (never the one being updated) uses it.
async function isSlugTaken(ctx: QueryCtx, slug: string, self?: Id<"notices">): Promise<boolean> {
  const hit = await ctx.db
    .query("notices")
    .withIndex("by_slug", (q) => q.eq("slug", slug))
    .first();
  return Boolean(hit && hit._id !== self);
}

// The requested slug, checked; or a fresh random one when none is requested.
async function resolveSlug(ctx: QueryCtx, requested: string | undefined, self?: Id<"notices">): Promise<string> {
  const slug = requested?.trim().toLowerCase();
  if (slug) {
    if (slug.length > SLUG_MAX || !SLUG_RE.test(slug)) {
      throw new Error("Invalid slug; use lowercase letters, numbers, and hyphens");
    }
    if (await isSlugTaken(ctx, slug, self)) throw new Error("Slug already in use");
    return slug;
  }
  for (let attempt = 0; attempt < SLUG_ATTEMPTS; attempt++) {
    const candidate = randomSlug();
    if (!(await isSlugTaken(ctx, candidate, self))) return candidate;
  }
  throw new Error("Could not allocate a unique slug");
}

// The validated, trimmed fields to store. `slug` is resolved only when given.
async function prepareWrite(
  ctx: QueryCtx,
  fields: EditableFields,
  self?: Id<"notices">
): Promise<EditableFields> {
  const { slug, files, ...rest } = fields;
  const title = rest.title.trim();
  const subject = rest.subject.trim();
  assertLength(title, TITLE_MAX, "제목");
  assertLength(subject, SUBJECT_MAX, "과목");
  if (rest.description.length > DESCRIPTION_MAX) throw new ConvexError("설명이 너무 길어요.");
  if (!ymdFromIso(rest.dueDate)) throw new Error("Invalid dueDate; expected a real YYYY-MM-DD date");

  const out: EditableFields = { ...rest, title, subject };
  if (files !== undefined) {
    const unique = [...new Set(files)];
    if (unique.length > MAX_ATTACHMENTS) throw new Error("Too many files");
    for (const id of unique) {
      if (!(await ctx.db.get(id))) throw new Error("File not found");
    }
    out.files = unique;
  }
  if (slug !== undefined || !self) out.slug = await resolveSlug(ctx, slug, self);
  return out;
}

export const create = adminMutation({
  args: editableFields,
  returns: v.id("notices"),
  handler: async (ctx, fields) => {
    const now = Date.now();
    return await ctx.db.insert("notices", {
      ...(await prepareWrite(ctx, fields)),
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Attachments dropped here are deleted later by files.collectOrphans.
export const update = adminMutation({
  args: { id: v.id("notices"), ...editableFields },
  returns: v.null(),
  handler: async (ctx, { id, ...fields }) => {
    if (!(await ctx.db.get(id))) throw new Error("Notice not found");
    await ctx.db.patch(id, { ...(await prepareWrite(ctx, fields, id)), updatedAt: Date.now() });
    return null;
  },
});

export const remove = adminMutation({
  args: { id: v.id("notices") },
  returns: v.null(),
  handler: async (ctx, { id }) => {
    if (await ctx.db.get(id)) await ctx.db.delete(id);
    return null;
  },
});

// ── Reads ────────────────────────────────────────────────────────────────

function toMinimalNotice(n: Doc<"notices">): MinimalNotice {
  return {
    _id: n._id,
    title: n.title,
    subject: n.subject,
    type: n.type,
    dueDate: n.dueDate,
    updatedAt: n.updatedAt,
    hasFiles: (n.files?.length ?? 0) > 0,
    summary: summarizeDescription(n.description),
    ...(n.slug !== undefined ? { slug: n.slug } : {}),
  };
}

// Rows come off the by_due_date index, so groups are already in date order.
function groupByDay(rows: Doc<"notices">[], today: string): DayGroup[] {
  const groups = new Map<string, DayGroup>();
  for (const n of rows) {
    let group = groups.get(n.dueDate);
    if (!group) {
      const ymd = ymdFromIso(n.dueDate) ?? n.dueDate;
      group = { date: n.dueDate, displayDate: dayLabel(ymd, today), isToday: ymd === today, notices: [] };
      groups.set(n.dueDate, group);
    }
    group.notices.push(toMinimalNotice(n));
  }
  return [...groups.values()];
}

// Newest month first; monthKey is the YYYY-MM prefix of the due dates.
function summarizeMonths(rows: Doc<"notices">[]): MonthSummary[] {
  const months = new Map<string, MonthSummary>();
  for (const n of rows) {
    const monthKey = n.dueDate.slice(0, 7);
    const month = months.get(monthKey);
    if (month) month.total += 1;
    else {
      const [y, m] = monthKey.split("-").map(Number);
      months.set(monthKey, { monthKey, monthName: `${y}년 ${m}월`, total: 1 });
    }
  }
  return [...months.values()].reverse();
}

function cutoffOf(clock: SchoolClock): string {
  assertYmd(clock.today, "today");
  return noticeCutoff(clock);
}

async function currentRows(ctx: QueryCtx, cutoff: string) {
  return await ctx.db
    .query("notices")
    .withIndex("by_due_date", (q) => q.gte("dueDate", cutoff))
    .collect();
}

export const currentGroups = query({
  args: schoolClockArgs,
  returns: v.array(dayGroup),
  handler: async (ctx, clock) => groupByDay(await currentRows(ctx, cutoffOf(clock)), clock.today),
});

export const overview = query({
  args: schoolClockArgs,
  returns: v.object({
    currentGroups: v.array(dayGroup),
    pastMonths: v.array(monthSummary),
  }),
  handler: async (ctx, clock) => {
    const cutoff = cutoffOf(clock);
    const [current, past] = await Promise.all([
      currentRows(ctx, cutoff),
      ctx.db.query("notices").withIndex("by_due_date", (q) => q.lt("dueDate", cutoff)).collect(),
    ]);
    return { currentGroups: groupByDay(current, clock.today), pastMonths: summarizeMonths(past) };
  },
});

export const pastByMonth = query({
  args: { monthKey: v.string(), ...schoolClockArgs },
  returns: v.array(dayGroup),
  handler: async (ctx, { monthKey, ...clock }) => {
    const cutoff = cutoffOf(clock);
    if (!/^\d{4}-\d{2}$/.test(monthKey)) return [];
    const start = `${monthKey}-01`;
    const end = `${monthKey}-32`; // past every real day of the month
    const upper = end < cutoff ? end : cutoff;
    const rows = await ctx.db
      .query("notices")
      .withIndex("by_due_date", (q) => q.gte("dueDate", start).lt("dueDate", upper))
      .collect();
    return groupByDay(rows, clock.today);
  },
});

// By slug, or by id for links made before notices had slugs.
export const detail = query({
  args: { id: v.string() },
  returns: v.object({
    notice: v.union(noticeDoc, v.null()),
    files: v.array(publicFile),
  }),
  handler: async (ctx, { id }): Promise<{ notice: Doc<"notices"> | null; files: PublicFile[] }> => {
    if (id.length === 0 || id.length > DETAIL_ID_MAX) return { notice: null, files: [] };
    const bySlug = await ctx.db
      .query("notices")
      .withIndex("by_slug", (q) => q.eq("slug", id))
      .first();
    const docId = ctx.db.normalizeId("notices", id);
    const notice = bySlug ?? (docId ? await ctx.db.get(docId) : null);
    if (!notice) return { notice: null, files: [] };
    const files = await Promise.all((notice.files ?? []).map((fid) => ctx.db.get(fid)));
    return { notice, files: files.filter((f): f is Doc<"files"> => f !== null).map(projectFile) };
  },
});
