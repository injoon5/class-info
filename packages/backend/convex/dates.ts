// Shared KST (UTC+9) date helpers. Convex runs in UTC, so we shift a UTC
// instant by +9h and then read its UTC-based fields as if they were KST.

const KST_OFFSET_MS = 9 * 60 * 60_000;

export const WEEKDAYS_KR = ['일', '월', '화', '수', '목', '금', '토'] as const;

export function getNowKst(): Date {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60_000;
  return new Date(utc + KST_OFFSET_MS);
}

export function getTodayKst(): Date {
  const now = getNowKst();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export function weekdayKr(date: Date): string {
  return WEEKDAYS_KR[date.getDay()];
}

// YYYY-MM-DD (matches stored notice dueDate format)
export function toIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// YYYYMMDD (matches stored meal/schedule date format)
export function toYyyymmdd(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

// Monday–Friday of the KST week `offsetWeeks` away from today (times normalized
// to noon to avoid DST edge cases).
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
