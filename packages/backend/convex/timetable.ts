import { internalAction, internalMutation, query } from "./_generated/server";
import { v, type Infer } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { projectTimetable } from "./project";
import { timetableDoc, timetableSlot } from "./validators";

type Slot = Infer<typeof timetableSlot>;

// `/timetable` merges Comcigan and NEIS. `auto` is the upstream default, but we
// send it anyway so a future change to that default can't silently reshape the
// grid: `auto` is the source this app wants. Comcigan supplies bell times,
// teachers and the short subject nicknames; NEIS fills days and periods
// Comcigan never published. `comcigan` pins the pre-merge behaviour.
const timetableSource = v.union(
  v.literal("auto"),
  v.literal("comcigan"),
  v.literal("neis")
);

// A NEIS-only week carries the same keys with empty values: no teachers, no
// bell times, no LOAD_DTM, and never a replacement. Everything below treats
// those as ordinary data rather than a malformed payload.
function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function num(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function normalizeSlot(raw: unknown): Slot | null {
  if (!raw || typeof raw !== "object") return null;
  const slot = raw as Record<string, unknown>;
  const period = num(slot.period);
  if (period <= 0) return null;

  const original = slot.original;
  return {
    period,
    subject: str(slot.subject),
    teacher: str(slot.teacher),
    replaced: slot.replaced === true,
    original:
      original && typeof original === "object"
        ? {
            period: num((original as Record<string, unknown>).period),
            subject: str((original as Record<string, unknown>).subject),
            teacher: str((original as Record<string, unknown>).teacher),
          }
        : null,
  };
}

function normalizeWeek(raw: unknown): Slot[][] {
  if (!Array.isArray(raw)) return [];
  return raw.map((day) =>
    Array.isArray(day)
      ? day.map(normalizeSlot).filter((slot): slot is Slot => slot !== null)
      : []
  );
}

// Errors arrive as `{ ok: false, error: { code, message, details } }`. Older
// deploys of the API answer some failures with a bare body, so a missing
// envelope falls back to the status line.
async function readError(res: Response): Promise<{ code: string; message: string }> {
  let body: unknown;
  try {
    body = await res.json();
  } catch {
    return { code: "", message: `${res.status} ${res.statusText}` };
  }
  const error = (body as { error?: unknown } | null)?.error;
  if (!error || typeof error !== "object") {
    return { code: "", message: `${res.status} ${res.statusText}` };
  }
  const { code, message } = error as Record<string, unknown>;
  return { code: str(code), message: str(message) || `${res.status} ${res.statusText}` };
}

export const upsert = internalMutation({
  args: {
    week: v.number(),
    day_time: v.array(v.string()),
    timetable: v.array(v.array(timetableSlot)),
    update_date: v.string(),
  },
  returns: v.id("timetables"),
  handler: async (
    ctx,
    { week, day_time, timetable, update_date }
  ): Promise<Id<"timetables">> => {
    const existing = await ctx.db
      .query("timetables")
      .withIndex("by_week", (q) => q.eq("week", week))
      .first();

    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, { day_time, timetable, update_date, week, editedAt: now });
      console.log(`[timetable.upsert] updated week=${week}`);
      return existing._id;
    }

    const id = await ctx.db.insert("timetables", { day_time, timetable, update_date, week, editedAt: now });
    console.log(`[timetable.upsert] inserted week=${week}`);
    return id;
  },
});

export const fetchAndSave = internalAction({
  args: {
    grade: v.number(),
    classno: v.number(),
    week: v.number(),
    schoolcode: v.string(),
    source: v.optional(timetableSource),
  },
  // Null when the week has nothing to store — a break, or a payload that came
  // back structurally fine but empty. Blanking a good week over either would
  // leave the app with no timetable at all until the next poll.
  returns: v.union(v.id("timetables"), v.null()),
  handler: async (
    ctx,
    { grade, classno, week, schoolcode, source = "auto" }
  ): Promise<Id<"timetables"> | null> => {
    const url = `https://api.timefor.school/timetable?grade=${encodeURIComponent(
      String(grade)
    )}&classno=${encodeURIComponent(String(classno))}&week=${encodeURIComponent(
      String(week)
    )}&schoolcode=${encodeURIComponent(schoolcode)}&source=${encodeURIComponent(source)}`;

    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) {
      const { code, message } = await readError(res);
      // Neither source published this week — a school break, most often. That
      // is an ordinary answer, not a fault worth failing the cron over.
      if (code === "NEIS_DATA_NOT_FOUND") {
        console.log(
          `[timetable.fetchAndSave] no rows for week=${week} source=${source} (${message})`
        );
        return null;
      }
      throw new Error(
        `Failed to fetch timetable (${res.status}${code ? ` ${code}` : ""}): ${message}`
      );
    }

    const data = (await res.json()) as {
      day_time?: unknown;
      timetable?: unknown;
      update_date?: unknown;
    };

    if (!Array.isArray(data.day_time) || !Array.isArray(data.timetable)) {
      throw new Error("Unexpected timetable payload shape");
    }

    const day_time = data.day_time.filter((s): s is string => typeof s === "string");
    const timetable = normalizeWeek(data.timetable);
    const periods = timetable.reduce((total, day) => total + day.length, 0);
    if (periods === 0) {
      console.warn(`[timetable.fetchAndSave] empty grid for week=${week} source=${source}; keeping stored week`);
      return null;
    }

    console.log(
      `[timetable.fetchAndSave] grade=${grade} class=${classno} week=${week} source=${source} days=${timetable.length} periods=${periods}`
    );
    return await ctx.runMutation(internal.timetable.upsert, {
      week,
      day_time,
      timetable,
      update_date: str(data.update_date),
    });
  },
});

export const getByWeek = query({
  args: { week: v.union(v.literal(0), v.literal(1)) },
  returns: v.union(timetableDoc, v.null()),
  handler: async (ctx, { week }) => {
    const row = await ctx.db
      .query("timetables")
      .withIndex("by_week", (q) => q.eq("week", week))
      .first();
    return row ? projectTimetable(row) : null;
  },
});
