// Shared KST (UTC+9) date helpers for the frontend. Convex stores KST-based
// dates, so the client computes "now" the same way the backend does.

export const WEEKDAYS_KR = ['일', '월', '화', '수', '목', '금', '토'] as const;

export function getNowInKst(): Date {
	const now = new Date();
	const utc = now.getTime() + now.getTimezoneOffset() * 60_000;
	return new Date(utc + 9 * 60 * 60_000);
}

export function pad2(n: number): string {
	return String(n).padStart(2, '0');
}

// YYYY-MM-DD from a Date's local fields (KST-shifted Dates from getNowInKst).
export function toIsoDate(d: Date): string {
	return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

// Notices roll to "past" at 16:00 KST. Passed into Convex so queries stay cacheable.
export function noticeCutoffIso(now: Date = getNowInKst()): string {
	const moveToTomorrow = now.getHours() >= 16;
	const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + (moveToTomorrow ? 1 : 0));
	return toIsoDate(d);
}

export function todayIso(now: Date = getNowInKst()): string {
	return toIsoDate(now);
}

export function noticeClock(now: Date = getNowInKst()): { cutoff: string; today: string } {
	return { cutoff: noticeCutoffIso(now), today: todayIso(now) };
}

// Monday of the current KST week as YYYYMMDD — meal query bound, not Date.now().
export function thisMondayYyyymmdd(now: Date = getNowInKst()): string {
	const day = now.getDay();
	const monday = new Date(now);
	monday.setDate(now.getDate() + (day === 0 ? -6 : 1 - day));
	return yyyymmdd(monday);
}

export function addDaysYyyymmdd(s: string, days: number): string {
	const y = Number(s.slice(0, 4));
	const m = Number(s.slice(4, 6));
	const d = Number(s.slice(6, 8));
	const dt = new Date(y, m - 1, d + days);
	return yyyymmdd(dt);
}

export function parseIsoDate(iso: string): { y: number; m: number; d: number } | null {
	const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
	if (!match) return null;
	const y = Number(match[1]);
	const m = Number(match[2]);
	const d = Number(match[3]);
	const dt = new Date(y, m - 1, d);
	if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) return null;
	return { y, m, d };
}

// YYYYMMDD from a Date's local fields.
export function yyyymmdd(d: Date): string {
	return `${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}`;
}

// YYYYMMDD from explicit parts (month is 0-indexed).
export function toYyyymmdd(year: number, month: number, day: number): string {
	return `${year}${pad2(month + 1)}${pad2(day)}`;
}

export function weekdayKr(d: Date): string {
	return WEEKDAYS_KR[d.getDay()];
}

// ── Timestamps ───────────────────────────────────────────────────────────────
// Absolute is the fallback and the tooltip; relative is what the cell shows.
// Callers pass an explicit `now` so server-rendered output stays deterministic.

export function formatAbsolute(ts: number | string | Date): string {
	return new Date(ts).toLocaleString('ko-KR', {
		year: 'numeric',
		month: 'long',
		day: 'numeric',
		hour: '2-digit',
		minute: '2-digit'
	});
}

export function formatRelative(ts: number | string | Date, now: number = Date.now()): string {
	const then = new Date(ts).getTime();
	if (Number.isNaN(then)) return '';
	const minutes = Math.floor((now - then) / 60_000);
	if (minutes < 0) return '방금 전';
	if (minutes < 1) return '방금 전';
	if (minutes < 60) return `${minutes}분 전`;
	const hours = Math.floor(minutes / 60);
	if (hours < 24) return `${hours}시간 전`;
	const days = Math.floor(hours / 24);
	if (days < 7) return `${days}일 전`;
	if (days < 28) return `${Math.floor(days / 7)}주 전`;
	// Older than a month: an absolute date carries more than "5주 전" does.
	return new Date(ts).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
}
