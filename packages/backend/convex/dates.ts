// Calendar dates in the school's zone, shared by the backend and the web app.
// A date is a YYYYMMDD string throughout; notices' ISO dueDate is converted
// at the edge. Instants become dates only through schoolClock/isAfterDinner,
// which shift by the configured offset and read UTC fields, so nothing here
// depends on the host's time zone.

import {
  DAY_ROLLOVER_HOUR,
  DINNER_END_HOUR,
  TIMEZONE_OFFSET_HOURS,
} from "./config";
import type { Infer } from "convex/values";
import type { eventSource } from "./validators";

export const WEEKDAYS_KR = ["일", "월", "화", "수", "목", "금", "토"] as const;

const YMD = /^(\d{4})(\d{2})(\d{2})$/;
const ISO = /^(\d{4})-(\d{2})-(\d{2})$/;
const DAY_MS = 86_400_000;

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function fromUtc(date: Date): string {
  return `${date.getUTCFullYear()}${pad2(date.getUTCMonth() + 1)}${pad2(date.getUTCDate())}`;
}

/** YYYYMMDD from a year, 1-based month and day; out-of-range parts roll over. */
export function ymdFromParts(year: number, month: number, day: number): string {
  return fromUtc(new Date(Date.UTC(year, month - 1, day)));
}

export type DateParts = { year: number; month: number; day: number; weekday: string };

/** Calendar parts of a real YYYYMMDD date; null when malformed. */
export function ymdParts(ymd: string): DateParts | null {
  const match = YMD.exec(ymd);
  if (!match) return null;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return { year, month, day, weekday: WEEKDAYS_KR[date.getUTCDay()]! };
}

export function assertYmd(ymd: string, field = "date"): DateParts {
  const parts = ymdParts(ymd);
  if (!parts) throw new Error(`Invalid ${field}; expected a real YYYYMMDD date`);
  return parts;
}

/** YYYY-MM-DD → YYYYMMDD; null unless it is a real date. */
export function ymdFromIso(iso: string): string | null {
  const match = ISO.exec(iso);
  if (!match) return null;
  const ymd = `${match[1]}${match[2]}${match[3]}`;
  return ymdParts(ymd) ? ymd : null;
}

export function isoFromYmd(ymd: string): string {
  return `${ymd.slice(0, 4)}-${ymd.slice(4, 6)}-${ymd.slice(6, 8)}`;
}

function utcMs(ymd: string): number {
  const { year, month, day } = assertYmd(ymd);
  return Date.UTC(year, month - 1, day);
}

export function addDays(ymd: string, days: number): string {
  return fromUtc(new Date(utcMs(ymd) + days * DAY_MS));
}

/** 0 = Sunday … 6 = Saturday. */
export function weekdayOf(ymd: string): number {
  return new Date(utcMs(ymd)).getUTCDay();
}

/** Monday of the Mon–Sun week holding `ymd`. */
export function mondayOf(ymd: string): string {
  const dow = weekdayOf(ymd);
  return addDays(ymd, dow === 0 ? -6 : 1 - dow);
}

export function daysBetween(fromYmd: string, toYmd: string): number {
  return Math.round((utcMs(toYmd) - utcMs(fromYmd)) / DAY_MS);
}

// ── Labels ───────────────────────────────────────────────────────────────

/** "9/21 (월)" */
export function shortDate(ymd: string): string {
  const p = ymdParts(ymd);
  return p ? `${p.month}/${p.day} (${p.weekday})` : ymd;
}

// "오늘"/"내일" against the real today (never the display day), else "".
export function relativeDayLabel(ymd: string, today: string): string {
  if (ymd === today) return "오늘";
  if (ymd === addDays(today, 1)) return "내일";
  return "";
}

/** "오늘", "내일", or "9/21 (월)". */
export function dayLabel(ymd: string, today: string): string {
  return relativeDayLabel(ymd, today) || shortDate(ymd);
}

// "D-7" / "D-DAY" / "D+3", counted in whole calendar days from today. The day
// itself is D-DAY rather than D-0 — that is how a Korean reader writes it.
export function ddayLabel(ymd: string, today: string): string {
  const days = daysBetween(today, ymd);
  if (days === 0) return "D-DAY";
  return days > 0 ? `D-${days}` : `D+${-days}`;
}

// ── Clock ────────────────────────────────────────────────────────────────

export type SchoolClock = { today: string; afterRollover: boolean };

function schoolTime(now: number): { today: string; hour: number } {
  const shifted = new Date(now + TIMEZONE_OFFSET_HOURS * 3_600_000);
  return { today: fromUtc(shifted), hour: shifted.getUTCHours() };
}

export function schoolClock(now: number = Date.now()): SchoolClock {
  const { today, hour } = schoolTime(now);
  return { today, afterRollover: hour >= DAY_ROLLOVER_HOUR };
}

export function isAfterDinner(now: number = Date.now()): boolean {
  return schoolTime(now).hour >= DINNER_END_HOUR;
}

/** Monday of the week `offsetWeeks` from this one (0 = this week). */
export function weekStartFor(offsetWeeks: number, now: number = Date.now()): string {
  return addDays(mondayOf(schoolClock(now).today), offsetWeeks * 7);
}

// ── School days ──────────────────────────────────────────────────────────

// Long enough to jump a summer break, in both directions: forward to find the
// next school day, backward to find the 방학 marker that started the current one.
export const SCHOOL_DAY_LOOKAHEAD = 90;

const CLOSED_EVENT_TYPES = new Set(["공휴일", "휴업일", "재량휴업일"]);

export function isClosedEventType(eventType: string | null | undefined): boolean {
  return CLOSED_EVENT_TYPES.has(eventType ?? "");
}

export type ScheduleHint = {
  date: string;
  title: string;
  eventType?: string | null;
  source: Infer<typeof eventSource>;
};

// A break marker is the whole title ("여름방학", "겨울방학 시작"). 방학식 is
// the closing ceremony, still a school day, so it must not match.
const VACATION_TITLE = /^[가-힣]*방학(\s*시작)?$/;

export function isVacationTitle(title: string): boolean {
  return VACATION_TITLE.test(title.trim());
}

// Deliberately looser than the vacation match. A missed 개학 leaves a break
// running to the end of the range; a spurious one only ends it early.
function isReopenTitle(title: string): boolean {
  return title.includes("개학");
}

function isWeekend(ymd: string): boolean {
  const dow = weekdayOf(ymd);
  return dow === 0 || dow === 6;
}

// Dates in range that aren't school days. 휴업일/공휴일 close their date; a
// 방학 title closes every day up to the next 개학, since NEIS often tags only
// a break's first day. Only NEIS rows mark breaks: custom events mention 방학
// in passing. So rangeStart must reach back far enough to include a break
// already under way (SCHOOL_DAY_LOOKAHEAD days).
export function closedYmdsFromSchedule(
  events: ScheduleHint[],
  rangeStart: string,
  rangeEnd: string,
): Set<string> {
  const closed = new Set<string>();
  const vacationStarts: string[] = [];
  const reopens: string[] = [];
  for (const event of events) {
    if (event.date < rangeStart || event.date > rangeEnd) continue;
    if (isClosedEventType(event.eventType)) closed.add(event.date);
    if (event.source !== "school") continue;
    if (isVacationTitle(event.title)) vacationStarts.push(event.date);
    if (isReopenTitle(event.title)) reopens.push(event.date);
  }
  vacationStarts.sort();
  reopens.sort();
  for (const start of vacationStarts) {
    const reopen = reopens.find((date) => date > start);
    for (let d = start; d <= rangeEnd && (!reopen || d < reopen); d = addDays(d, 1)) {
      closed.add(d);
    }
  }
  return closed;
}

export function isSchoolYmd(ymd: string, closed: Set<string>): boolean {
  return !isWeekend(ymd) && !closed.has(ymd);
}

/** The day home shows: today until the rollover, then the next school day. */
export function resolveDisplayDay({ today, afterRollover }: SchoolClock, closed: Set<string>): string {
  assertYmd(today, "today");
  if (!afterRollover && isSchoolYmd(today, closed)) return today;
  for (let i = 1; i <= SCHOOL_DAY_LOOKAHEAD; i++) {
    const ymd = addDays(today, i);
    if (isSchoolYmd(ymd, closed)) return ymd;
  }
  // No school day in the lookahead (bad data): show the next weekday.
  return resolveDisplayDay({ today, afterRollover: true }, new Set());
}

// The school year (March–February) plus a month either side, keyed on the
// school year so January and February still reach back to March.
export function scheduleWindow(today: string): { start: string; end: string } {
  const { year, month } = assertYmd(today, "today");
  const schoolYear = month >= 3 ? year : year - 1;
  return {
    start: ymdFromParts(schoolYear - 1, 12, 1),
    end: ymdFromParts(schoolYear + 1, 3, 0),
  };
}
