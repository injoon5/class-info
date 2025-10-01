import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const list = query({
  handler: async (ctx) => {
    try {
      // Prefer index-based ordering
      const notices = await ctx.db
        .query("notices")
        .withIndex("by_due_date")
        .collect();
      return notices.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
    } catch (error) {
      console.error("Error fetching notices:", error);
      return []; // Return empty array on error
    }
  },
});

function getNowKst(): Date {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  // KST is UTC+9
  return new Date(utc + 9 * 60 * 60000);
}

function getTodayKst(): Date {
  const now = getNowKst();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}


function toYyyyMmDd(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function kstCutoffDateString(): string {
  // Same 16:00 KST rule, but return plain YYYY-MM-DD to match stored dueDate format
  const now = getNowKst();
  const moveToTomorrow = now.getHours() >= 16;
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + (moveToTomorrow ? 1 : 0));
  return toYyyyMmDd(d);
}

function generateRandomSlug(): string {
  let slug = '';
  for (let i = 0; i < 5; i++) {
    slug += String.fromCharCode(97 + Math.floor(Math.random() * 26));
  }
  return slug;
}

async function isSlugTaken(ctx: any, slug: string): Promise<boolean> {
  if (!slug) return false;
  const hit = await ctx.db
    .query("notices")
    .withIndex("by_slug", (q: any) => q.eq("slug", slug))
    .first();
  return Boolean(hit);
}

async function createUniqueSlug(ctx: any): Promise<string> {
  const base = generateRandomSlug();
  let slug = base;
  let suffix = 0;
  while (await isSlugTaken(ctx, slug)) {
    suffix += 1;
    const tail = suffix.toString(36);
    slug = `${base}-${tail}`.slice(0, 48);
  }
  return slug;
}

function weekdayKr(date: Date): string {
  const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
  return weekdays[date.getDay()];
}

function toDisplayDate(due: Date, today: Date): { displayDate: string; isToday: boolean } {
  const isToday = due.toDateString() === today.toDateString();
  if (isToday) return { displayDate: '오늘', isToday: true };
  const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
  const isTomorrow = due.toDateString() === tomorrow.toDateString();
  if (isTomorrow) return { displayDate: '내일', isToday: false };
  return {
    displayDate: `${due.getMonth() + 1}/${due.getDate()} (${weekdayKr(due)})`,
    isToday: false,
  };
}

type MinimalNotice = {
  _id: any;
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
  try {
    const withoutQuery = url.split("?")[0].split("#")[0];
    const parts = withoutQuery.split("/");
    return parts[parts.length - 1] || url;
  } catch {
    return url;
  }
}

function summarizeDescription(description: string): string {
  const firstLine = description.split("\n")[0] || "";
  // Replace image markdown with filename: prefer alt text, fallback to URL basename
  return firstLine.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_m, alt, link) => {
    const trimmedAlt = String(alt || "").trim();
    if (trimmedAlt.length > 0) return trimmedAlt;
    return getUrlBasename(String(link || "").trim());
  });
}

function toMinimalNotice(n: any): MinimalNotice {
  return {
    _id: n._id,
    title: n.title,
    subject: n.subject,
    type: n.type,
    dueDate: n.dueDate,
    updatedAt: n.updatedAt,
    createdAt: n.createdAt,
    hasFiles: Array.isArray(n.files) && n.files.length > 0,
    summary: typeof n.description === 'string' ? summarizeDescription(n.description as string) : '',
    slug: typeof n.slug === 'string' ? n.slug : undefined,
  };
}

export const currentGroups = query({
  handler: async (ctx) => {
    const cutoff = kstCutoffDateString();
    const valid = await ctx.db
      .query("notices")
      .withIndex("by_due_date", q => q.gte("dueDate", cutoff))
      .collect();
    const today = getNowKst();
    const groups = new Map<string, { date: string; displayDate: string; isToday: boolean; notices: MinimalNotice[] }>();
    for (const n of valid) {
      const due = new Date(n.dueDate);
      const key = due.toDateString();
      const { displayDate, isToday } = toDisplayDate(due, today);
      if (!groups.has(key)) {
        groups.set(key, { date: key, displayDate, isToday, notices: [] });
      }
      groups.get(key)!.notices.push(toMinimalNotice(n));
    }
    return Array.from(groups.values()).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  },
});

export const pastMonths = query({
  handler: async (ctx) => {
    const cutoff = kstCutoffDateString();
    const valid = await ctx.db
      .query("notices")
      .withIndex("by_due_date", q => q.lt("dueDate", cutoff))
      .collect();
    const monthMap = new Map<string, { monthKey: string; monthName: string; total: number }>();
    for (const n of valid) {
      const d = new Date(n.dueDate);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const name = `${d.getFullYear()}년 ${d.getMonth() + 1}월`;
      if (!monthMap.has(key)) {
        monthMap.set(key, { monthKey: key, monthName: name, total: 0 });
      }
      monthMap.get(key)!.total += 1;
    }
    return Array.from(monthMap.values()).sort((a, b) => {
      // most recent first
      const [ay, am] = a.monthKey.split('-').map(Number);
      const [by, bm] = b.monthKey.split('-').map(Number);
      return by - ay || bm - am;
    });
  },
});

export const pastByMonth = query({
  args: { monthKey: v.string() },
  handler: async (ctx, { monthKey }) => {
    const [yearStr, monthStr] = monthKey.split('-');
    const year = Number(yearStr);
    const month = Number(monthStr);
    if (Number.isNaN(year) || Number.isNaN(month)) return [];
    const monthStart = toYyyyMmDd(new Date(year, month, 1));
    const nextMonthStart = toYyyyMmDd(new Date(year, month + 1, 1));
    const cutoff = kstCutoffDateString();
    const upper = nextMonthStart < cutoff ? nextMonthStart : cutoff;
    const valid = await ctx.db
      .query("notices")
      .withIndex("by_due_date", q => q.gte("dueDate", monthStart).lt("dueDate", upper))
      .collect();
    const today = getTodayKst();
    const groups = new Map<string, { date: string; displayDate: string; isToday: boolean; notices: MinimalNotice[] }>();
    for (const n of valid) {
      const d = new Date(n.dueDate);
      const key = d.toDateString();
      const { displayDate, isToday } = toDisplayDate(d, today);
      if (!groups.has(key)) {
        groups.set(key, { date: key, displayDate, isToday, notices: [] });
      }
      groups.get(key)!.notices.push(toMinimalNotice(n));
    }
    return Array.from(groups.values()).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  },
});

export const overview = query({
  handler: async (ctx) => {
    // currentGroups logic
    const cutoff = kstCutoffDateString();
    const currentRows = await ctx.db
      .query("notices")
      .withIndex("by_due_date", q => q.gte("dueDate", cutoff))
      .collect();
    const today = getTodayKst();
    const currentMap = new Map<string, { date: string; displayDate: string; isToday: boolean; notices: MinimalNotice[] }>();
    for (const n of currentRows) {
      const due = new Date(n.dueDate);
      const key = due.toDateString();
      const { displayDate, isToday } = toDisplayDate(due, today);
      if (!currentMap.has(key)) currentMap.set(key, { date: key, displayDate, isToday, notices: [] });
      currentMap.get(key)!.notices.push(toMinimalNotice(n));
    }
    const currentGroupsData = Array.from(currentMap.values()).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // pastMonths logic
    const pastRows = await ctx.db
      .query("notices")
      .withIndex("by_due_date", q => q.lt("dueDate", cutoff))
      .collect();
    const monthMap = new Map<string, { monthKey: string; monthName: string; total: number }>();
    for (const n of pastRows) {
      const d = new Date(n.dueDate);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const name = `${d.getFullYear()}년 ${d.getMonth() + 1}월`;
      if (!monthMap.has(key)) monthMap.set(key, { monthKey: key, monthName: name, total: 0 });
      monthMap.get(key)!.total += 1;
    }
    const pastMonthsData = Array.from(monthMap.values()).sort((a, b) => {
      const [ay, am] = a.monthKey.split('-').map(Number);
      const [by, bm] = b.monthKey.split('-').map(Number);
      return by - ay || bm - am;
    });

    return { currentGroups: currentGroupsData, pastMonths: pastMonthsData };
  },
});

export const detail = query({
  args: { id: v.string() },
  handler: async (ctx, { id }) => {

    // Try as slug first
    let notice = await ctx.db
      .query("notices")
      .withIndex("by_slug", q => q.eq("slug", id))
      .first();


    // If not found, try as id (must be a valid notice id)
    if (!notice) {
      const normalizedId = ctx.db.normalizeId("notices", id);
      if (normalizedId) {
        notice = await ctx.db.get(normalizedId);
      } else {
        notice = null;
      }
    }

    if (!notice) return { notice: null, files: [] as any[] };

    const files = Array.isArray(notice.files)
      ? (await Promise.all(notice.files.map((fid: any) => ctx.db.get(fid)))).filter(Boolean)
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

export const create = mutation({
  args: {
    title: v.string(),
    subject: v.string(),
    type: v.union(v.literal("수행평가"), v.literal("숙제"), v.literal("준비물"), v.literal("기타")),
    description: v.string(),
    dueDate: v.string(),
    files: v.optional(v.array(v.id("files"))),
    slug: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const slug = args.slug && args.slug.length > 0 ? args.slug : await createUniqueSlug(ctx);
    const noticeId = await ctx.db.insert("notices", {
      ...args,
      slug,
      createdAt: now,
      updatedAt: now,
    });
    return noticeId;
  },
});

export const update = mutation({
  args: {
    id: v.id("notices"),
    title: v.string(),
    subject: v.string(),
    type: v.union(v.literal("수행평가"), v.literal("숙제"), v.literal("준비물"), v.literal("기타")),
    description: v.string(),
    dueDate: v.string(),
    files: v.optional(v.array(v.id("files"))),
    slug: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, slug, ...updates } = args;
    let finalSlug = slug;
    if (slug === undefined) {
      // keep existing slug
    } else if (!slug || (await isSlugTaken(ctx, slug))) {
      finalSlug = await createUniqueSlug(ctx);
    }
    await ctx.db.patch(id, {
      ...updates,
      ...(finalSlug !== undefined ? { slug: finalSlug } : {}),
      updatedAt: Date.now(),
    });
  },
});

export const remove = mutation({
  args: { id: v.id("notices") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

// Backfill slugs for existing notices that don't have one
export const backfillMissingSlugs = mutation({
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