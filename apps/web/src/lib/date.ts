// Calendar parse/KST math lives in the backend dates module (Convex is UTC).
// Re-export it so the client doesn't keep a second, local-Date copy of the
// same functions. Timestamp formatters stay here — they're UI-only.

import {
	WEEKDAYS_KR,
	getNowKst as getNowInKst,
	parseIsoDate,
	parseYyyymmdd,
	addDaysYyyymmdd,
	toIsoDate,
	toYyyymmdd as yyyymmdd,
	weekdayKr,
	weekdayKrUtc,
	kstCutoffDateString as noticeCutoffIso,
} from '@class-info/backend/convex/dates';

export {
	WEEKDAYS_KR,
	getNowInKst,
	parseIsoDate,
	parseYyyymmdd,
	addDaysYyyymmdd,
	toIsoDate,
	yyyymmdd,
	weekdayKr,
	weekdayKrUtc,
	noticeCutoffIso,
};

export function pad2(n: number): string {
	return String(n).padStart(2, '0');
}

export function todayIso(now: Date = getNowInKst()): string {
	return toIsoDate(now);
}

export function noticeClock(now: Date = getNowInKst()): { cutoff: string; today: string } {
	return { cutoff: noticeCutoffIso(now), today: todayIso(now) };
}

export function thisMondayYyyymmdd(now: Date = getNowInKst()): string {
	const day = now.getDay();
	const monday = new Date(now);
	monday.setDate(now.getDate() + (day === 0 ? -6 : 1 - day));
	return yyyymmdd(monday);
}

// YYYYMMDD from explicit parts (month is 0-indexed). Distinct from `yyyymmdd(Date)`.
export function toYyyymmdd(year: number, month: number, day: number): string {
	return `${year}${pad2(month + 1)}${pad2(day)}`;
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
