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

function kstCutoffIso(): string {
  // After 16:00 KST, treat "today" as past for selection purposes
  const now = getNowKst();
  const moveToTomorrow = now.getHours() >= 16;
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + (moveToTomorrow ? 1 : 0));
  return d.toISOString();
}

function weekdayKr(date: Date): string {
  const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
  return weekdays[date.getDay()];
}

function toDisplayDate(due: Date, today: Date): { displayDate: string; isToday: boolean } {
  const isToday = due.toDateString() === today.toDateString();
  if (isToday) return { displayDate: '오늘', isToday: true };
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
};

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
    summary: typeof n.description === 'string' ? (n.description as string).split('\n')[0] : '',
  };
}

export const currentGroups = query({
  handler: async (ctx) => {
    const cutoff = kstCutoffIso();
    const valid = await ctx.db
      .query("notices")
      .withIndex("by_due_date", q => q.gte("dueDate", cutoff))
      .collect();
    const today = getTodayKst();
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
    const cutoff = kstCutoffIso();
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
    const monthStart = new Date(year, month, 1).toISOString();
    const nextMonthStart = new Date(year, month + 1, 1).toISOString();
    const cutoff = kstCutoffIso();
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
    const cutoff = kstCutoffIso();
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
  args: { id: v.id("notices") },
  handler: async (ctx, { id }) => {
    const notice = await ctx.db.get(id);
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
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const noticeId = await ctx.db.insert("notices", {
      ...args,
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
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    await ctx.db.patch(id, {
      ...updates,
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