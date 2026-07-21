import { v } from "convex/values";
import { internalMutation, mutation, query, type QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { requireAdmin } from "./auth";
import { deleteFilesByIds } from "./files";
import { getNowKst, getTodayKst, toIsoDate, weekdayKr } from "./dates";

const noticeFields = {
  title: v.string(),
  subject: v.string(),
  type: v.union(v.literal("수행평가"), v.literal("숙제"), v.literal("준비물"), v.literal("기타")),
  description: v.string(),
  dueDate: v.string(),
  files: v.optional(v.array(v.id("files"))),
  slug: v.optional(v.string()),
};

// ── Date helpers ──────────────────────────────────────────────────────────────

function kstCutoffDateString(): string {
  // Notices roll over to "past" at 16:00 KST. Returns YYYY-MM-DD to match the
  // stored dueDate format.
  const now = getNowKst();
  const moveToTomorrow = now.getHours() >= 16;
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + (moveToTomorrow ? 1 : 0));
  return toIsoDate(d);
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
function assertValidDueDate(dueDate: string): void {
  if (!ISO_DATE.test(dueDate) || Number.isNaN(new Date(dueDate).getTime())) {
    throw new Error("Invalid dueDate; expected a valid YYYY-MM-DD string");
  }
}

// ── Slugs ─────────────────────────────────────────────────────────────────────

function generateRandomSlug(): string {
  let slug = '';
  for (let i = 0; i < 5; i++) {
    slug += String.fromCharCode(97 + Math.floor(Math.random() * 26));
  }
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
  const base = generateRandomSlug();
  let slug = base;
  let suffix = 0;
  while (await isSlugTaken(ctx, slug, excludeId)) {
    suffix += 1;
    const tail = suffix.toString(36);
    slug = `${base}-${tail}`.slice(0, 48);
  }
  return slug;
}

// ── Notice → minimal projection ────────────────────────────────────────────────

type MinimalNotice = {
  _id: Id<"notices">;
  title: string;
  subject: string;
  type: string;
  dueDate: string;
  updatedAt?: number;
  createdAt?: number;
  hasFiles: boolean;
  summary: string;
  slug?: string;
};

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
    summary: typeof n.description === 'string' ? summarizeDescription(n.description) : '',
    slug: typeof n.slug === 'string' ? n.slug : undefined,
  };
}

// ── Grouping (shared by currentGroups / pastByMonth / overview) ─────────────────

type DayGroup = { date: string; displayDate: string; isToday: boolean; notices: MinimalNotice[] };

function toDisplayDate(due: Date, today: Date): { displayDate: string; isToday: boolean } {
  const isToday = due.toDateString() === today.toDateString();
  if (isToday) return { displayDate: '오늘', isToday: true };
  const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
  if (due.toDateString() === tomorrow.toDateString()) return { displayDate: '내일', isToday: false };
  return { displayDate: `${due.getMonth() + 1}/${due.getDate()} (${weekdayKr(due)})`, isToday: false };
}

function groupByDay(rows: Doc<"notices">[], today: Date): DayGroup[] {
  const groups = new Map<string, DayGroup>();
  for (const n of rows) {
    const due = new Date(n.dueDate);
    const key = due.toDateString();
    if (!groups.has(key)) {
      const { displayDate, isToday } = toDisplayDate(due, today);
      groups.set(key, { date: key, displayDate, isToday, notices: [] });
    }
    groups.get(key)!.notices.push(toMinimalNotice(n));
  }
  return Array.from(groups.values()).sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
}

type MonthSummary = { monthKey: string; monthName: string; total: number };

function summarizeMonths(rows: Doc<"notices">[]): MonthSummary[] {
  const monthMap = new Map<string, MonthSummary>();
  for (const n of rows) {
    const d = new Date(n.dueDate);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    if (!monthMap.has(key)) {
      monthMap.set(key, { monthKey: key, monthName: `${d.getFullYear()}년 ${d.getMonth() + 1}월`, total: 0 });
    }
    monthMap.get(key)!.total += 1;
  }
  return Array.from(monthMap.values()).sort((a, b) => {
    const [ay, am] = a.monthKey.split('-').map(Number);
    const [by, bm] = b.monthKey.split('-').map(Number);
    return by - ay || bm - am; // most recent first
  });
}

// ── Queries ─────────────────────────────────────────────────────────────────────

export const currentGroups = query({
  handler: async (ctx) => {
    const cutoff = kstCutoffDateString();
    const rows = await ctx.db
      .query("notices")
      .withIndex("by_due_date", (q) => q.gte("dueDate", cutoff))
      .collect();
    return groupByDay(rows, getTodayKst());
  },
});

export const pastMonths = query({
  handler: async (ctx) => {
    const cutoff = kstCutoffDateString();
    const rows = await ctx.db
      .query("notices")
      .withIndex("by_due_date", (q) => q.lt("dueDate", cutoff))
      .collect();
    return summarizeMonths(rows);
  },
});

export const pastByMonth = query({
  args: { monthKey: v.string() },
  handler: async (ctx, { monthKey }) => {
    const [yearStr, monthStr] = monthKey.split('-');
    const year = Number(yearStr);
    const month = Number(monthStr);
    if (Number.isNaN(year) || Number.isNaN(month)) return [];
    const monthStart = toIsoDate(new Date(year, month, 1));
    const nextMonthStart = toIsoDate(new Date(year, month + 1, 1));
    const cutoff = kstCutoffDateString();
    const upper = nextMonthStart < cutoff ? nextMonthStart : cutoff;
    const rows = await ctx.db
      .query("notices")
      .withIndex("by_due_date", (q) => q.gte("dueDate", monthStart).lt("dueDate", upper))
      .collect();
    return groupByDay(rows, getTodayKst());
  },
});

export const overview = query({
  handler: async (ctx) => {
    const cutoff = kstCutoffDateString();
    const today = getTodayKst();
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
  handler: async (ctx, { id }) => {
    // Try as slug first, then as a notice id.
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

export const getById = query({
  args: { id: v.id("notices") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// ── Mutations ────────────────────────────────────────────────────────────────

export const create = mutation({
  args: { sessionToken: v.string(), ...noticeFields },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.sessionToken);
    const { sessionToken: _t, ...fields } = args;
    assertValidDueDate(fields.dueDate);
    const now = Date.now();
    const slug = fields.slug && fields.slug.length > 0 ? fields.slug : await createUniqueSlug(ctx);
    return await ctx.db.insert("notices", { ...fields, slug, createdAt: now, updatedAt: now });
  },
});

export const update = mutation({
  args: { sessionToken: v.string(), id: v.id("notices"), ...noticeFields },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.sessionToken);
    const { sessionToken: _t, id, slug, ...updates } = args;
    assertValidDueDate(updates.dueDate);
    let finalSlug = slug;
    if (slug === undefined) {
      // keep existing slug
    } else if (!slug || (await isSlugTaken(ctx, slug, id))) {
      finalSlug = await createUniqueSlug(ctx, id);
    }
    await ctx.db.patch(id, {
      ...updates,
      ...(finalSlug !== undefined ? { slug: finalSlug } : {}),
      updatedAt: Date.now(),
    });
  },
});

export const remove = mutation({
  args: { sessionToken: v.string(), id: v.id("notices") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.sessionToken);
    const notice = await ctx.db.get(args.id);
    if (!notice) return;
    // Cascade: remove attached file records + their R2 objects so nothing leaks.
    if (Array.isArray(notice.files) && notice.files.length > 0) {
      await deleteFilesByIds(ctx, notice.files);
    }
    await ctx.db.delete(args.id);
  },
});

// Backfill slugs for existing notices that don't have one.
// Internal-only: run via the Convex dashboard, never exposed to clients.
export const backfillMissingSlugs = internalMutation({
  handler: async (ctx) => {
    const all = await ctx.db.query("notices").collect();
    let updated = 0;
    const results: { id: string; slug: string }[] = [];
    for (const n of all) {
      const hasValidSlug = typeof n.slug === 'string' && n.slug.trim().length > 0;
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
