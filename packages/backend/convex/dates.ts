// Shared KST (UTC+9) date helpers. Convex runs in UTC, so we shift a UTC
// instant by +9h and then read its UTC-based fields as if they were KST.
//
// Calendar dates (YYYY-MM-DD / YYYYMMDD) are always parsed via Date.UTC so
// grouping and weekday never depend on the isolate's timezone.

const KST_OFFSET_MS = 9 * 60 * 60_000;

export const WEEKDAYS_KR = ['일', '월', '화', '수', '목', '금', '토'] as const;

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const YYYYMMDD = /^(\d{4})(\d{2})(\d{2})$/;

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

export function getNowKst(): Date {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60_000;
  return new Date(utc + KST_OFFSET_MS);
}

// Home timetable/meals and notice "past" both flip at this KST hour.
export const DAY_ROLLOVER_HOUR_KST = 16;

export function calendarDate(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function addCalendarDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

export function getTodayKst(): Date {
  return calendarDate(getNowKst());
}

export function isAtOrAfterDayRollover(now: Date = getNowKst()): boolean {
  return now.getHours() >= DAY_ROLLOVER_HOUR_KST;
}

export function weekdayKr(date: Date): string {
  return WEEKDAYS_KR[date.getDay()];
}

export function weekdayKrUtc(y: number, m: number, d: number): string {
  return WEEKDAYS_KR[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
}

// YYYY-MM-DD (matches stored notice dueDate format). Reads local fields — pass
// a KST-shifted Date from getNowKst(), or a Date built from calendar parts.
export function toIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function toIsoDateUtc(y: number, m: number, d: number): string {
  return `${y}-${pad2(m)}-${pad2(d)}`;
}

// YYYYMMDD (matches stored meal/schedule date format)
export function toYyyymmdd(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

export type Ymd = { y: number; m: number; d: number };

function fromUtcParts(y: number, m: number, d: number): Ymd | null {
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (
    dt.getUTCFullYear() !== y ||
    dt.getUTCMonth() !== m - 1 ||
    dt.getUTCDate() !== d
  ) {
    return null;
  }
  return { y, m, d };
}

export function parseIsoDate(iso: string): Ymd | null {
  const match = ISO_DATE.exec(iso);
  if (!match) return null;
  return fromUtcParts(Number(match[1]), Number(match[2]), Number(match[3]));
}

export function parseYyyymmdd(s: string): Ymd | null {
  const match = YYYYMMDD.exec(s);
  if (!match) return null;
  return fromUtcParts(Number(match[1]), Number(match[2]), Number(match[3]));
}

export function assertIsoDate(iso: string, field = "date"): Ymd {
  const parsed = parseIsoDate(iso);
  if (!parsed) throw new Error(`Invalid ${field}; expected a real YYYY-MM-DD date`);
  return parsed;
}

export function assertYyyymmdd(s: string, field = "date"): Ymd {
  const parsed = parseYyyymmdd(s);
  if (!parsed) throw new Error(`Invalid ${field}; expected a real YYYYMMDD date`);
  return parsed;
}

export function addDaysYyyymmdd(s: string, days: number): string {
  const { y, m, d } = assertYyyymmdd(s);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return `${dt.getUTCFullYear()}${pad2(dt.getUTCMonth() + 1)}${pad2(dt.getUTCDate())}`;
}

export function addDaysIso(iso: string, days: number): string {
  const { y, m, d } = assertIsoDate(iso);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return toIsoDateUtc(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
}

// Notices roll over to "past" at DAY_ROLLOVER_HOUR_KST. Returns YYYY-MM-DD
// to match the stored dueDate format.
export function kstCutoffDateString(now: Date = getNowKst()): string {
  return toIsoDate(addCalendarDays(now, isAtOrAfterDayRollover(now) ? 1 : 0));
}

const SCHOOL_DAY_LOOKAHEAD = 14;

export function nextSchoolDay(
  from: Date,
  isSchoolDay: (d: Date) => boolean,
  lookahead = SCHOOL_DAY_LOOKAHEAD,
): Date {
  for (let i = 1; i <= lookahead; i++) {
    const d = addCalendarDays(from, i);
    if (isSchoolDay(d)) return d;
  }
  return addCalendarDays(from, lookahead);
}

// The school day home should show: today until the rollover hour, otherwise
// the next weekday that isn't a holiday. Friday after the hour → Monday.
export function resolveSchoolDisplayDay(
  now: Date,
  isSchoolDay: (d: Date) => boolean,
): Date {
  const today = calendarDate(now);
  if (!isAtOrAfterDayRollover(now) && isSchoolDay(today)) return today;
  return nextSchoolDay(today, isSchoolDay);
}

// Monday–Friday of the KST week `offsetWeeks` away from today (times normalized
// to noon to avoid DST edge cases). Used by meal/timetable fetch actions.
export function getWeekRangeKst(offsetWeeks: number): { start: Date; end: Date } {
  const nowKst = getNowKst();
  const day = nowKst.getDay(); // 0 Sun … 6 Sat
  const monday = new Date(nowKst);
  const diffToMon = (day === 0 ? -6 : 1 - day) + offsetWeeks * 7;
  monday.setDate(nowKst.getDate() + diffToMon);
  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 4);
  monday.setHours(12, 0, 0, 0);
  friday.setHours(12, 0, 0, 0);
  return { start: monday, end: friday };
}
