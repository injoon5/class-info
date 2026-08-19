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

// After DAY_ROLLOVER_HOUR_KST this is tomorrow. Notices use it as the
// current/past split (due today → past). Home uses the same hour via
// isAtOrAfterDayRollover, then skips to the next school day.
export function kstCutoffDateString(now: Date = getNowKst()): string {
  return toIsoDate(addCalendarDays(now, isAtOrAfterDayRollover(now) ? 1 : 0));
}

export function noticeClock(now: Date = getNowKst()): { cutoff: string; today: string } {
  return { cutoff: kstCutoffDateString(now), today: toIsoDate(now) };
}

export function schoolDisplayClock(now: Date = getNowKst()): {
  today: string;
  afterRollover: boolean;
} {
  return { today: toYyyymmdd(now), afterRollover: isAtOrAfterDayRollover(now) };
}

export function ymdWeekday(s: string): number {
  const { y, m, d } = assertYyyymmdd(s);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

export function mondayYyyymmddOf(ymd: string): string {
  const dow = ymdWeekday(ymd);
  return addDaysYyyymmdd(ymd, dow === 0 ? -6 : 1 - dow);
}

export function weekOffsetBetween(fromYmd: string, toYmd: string): number {
  const a = mondayYyyymmddOf(fromYmd);
  const b = mondayYyyymmddOf(toYmd);
  const pa = assertYyyymmdd(a);
  const pb = assertYyyymmdd(b);
  const days =
    (Date.UTC(pb.y, pb.m - 1, pb.d) - Date.UTC(pa.y, pa.m - 1, pa.d)) / 86_400_000;
  return Math.round(days / 7);
}

const CLOSED_EVENT_TYPES = new Set(["공휴일", "휴업일", "재량휴업일"]);

export type ScheduleHint = {
  date: string;
  title: string;
  eventType?: string | null;
  source?: string | null;
};

export function isClosedEventType(eventType: string | null | undefined): boolean {
  return CLOSED_EVENT_TYPES.has(eventType ?? "");
}

// Only NEIS rows drive break detection. Admin-authored custom events share this
// table and routinely mention 방학 in passing ("방학 과제 제출일"), which must not
// close the school.
function isSchoolSourced(hint: ScheduleHint): boolean {
  return hint.source === "school";
}

// Anchored on purpose: a break marker is the whole title ("여름방학", "방학",
// "겨울방학 시작"), never a title that merely contains the word. 방학식 is the
// closing ceremony and is still a school day, so it must not match.
const VACATION_TITLE = /^[가-힣]*방학(\s*시작)?$/;

export function isVacationTitle(title: string): boolean {
  return VACATION_TITLE.test(title.trim());
}

// Deliberately looser than the vacation match. A missed 개학 leaves a break
// running to the end of the range; a spurious one only ends it early.
export function isReopenTitle(title: string): boolean {
  return title.includes("개학");
}

function isWeekendYmd(s: string): boolean {
  const dow = ymdWeekday(s);
  return dow === 0 || dow === 6;
}

// Build the set of YYYYMMDD dates that are not school days in [rangeStart, rangeEnd].
// 휴업일/공휴일 close that date. A 방학 title closes every day until the next 개학
// (exclusive), because NEIS often tags only the first day of break.
//
// That span-fill is why rangeStart must reach back far enough to include the
// marker of a break already under way — pass a start at least SCHOOL_DAY_LOOKAHEAD
// days behind today, or every day from the second day of a break onward looks
// like a school day.
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
    if (!isSchoolSourced(event)) continue;
    if (isVacationTitle(event.title)) vacationStarts.push(event.date);
    if (isReopenTitle(event.title)) reopens.push(event.date);
  }
  vacationStarts.sort();
  reopens.sort();
  for (const start of vacationStarts) {
    const reopen = reopens.find((date) => date > start);
    const endExclusive = reopen ?? addDaysYyyymmdd(rangeEnd, 1);
    let d = start;
    while (d < endExclusive && d <= rangeEnd) {
      closed.add(d);
      d = addDaysYyyymmdd(d, 1);
    }
  }
  return closed;
}

export function isSchoolYmd(ymd: string, closed: Set<string>): boolean {
  if (isWeekendYmd(ymd)) return false;
  return !closed.has(ymd);
}

// Long enough to jump a summer break, in both directions: forward to find the
// next school day, backward to find the 방학 marker that started the current one.
export const SCHOOL_DAY_LOOKAHEAD = 90;

export function resolveSchoolDisplayYmd(
  today: string,
  afterRollover: boolean,
  closed: Set<string>,
  lookahead = SCHOOL_DAY_LOOKAHEAD,
): string {
  assertYyyymmdd(today);
  if (!afterRollover && isSchoolYmd(today, closed)) return today;
  for (let i = 1; i <= lookahead; i++) {
    const ymd = addDaysYyyymmdd(today, i);
    if (isSchoolYmd(ymd, closed)) return ymd;
  }
  // Nothing open in the whole lookahead — missing or malformed schedule data.
  // Show the next weekday rather than a date three months out; the timetable
  // and meal for it will simply be empty.
  let fallback = addDaysYyyymmdd(today, 1);
  while (isWeekendYmd(fallback)) fallback = addDaysYyyymmdd(fallback, 1);
  return fallback;
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
