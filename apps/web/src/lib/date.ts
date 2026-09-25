// Calendar math lives in the backend's dates module so server and client share
// one implementation. Display formatters live here.

import {
	getNowKst as getNowInKst,
	parseIsoDate,
	parseYyyymmdd,
	addDaysYyyymmdd,
	toYyyymmdd as yyyymmdd,
	weekdayKrUtc,
	ymdWeekday,
	weekOffsetBetween,
	relativeDayLabel,
	ddayLabel,
	isAtOrAfterDinnerEnd,
	noticeClock,
	schoolDisplayClock,
	scheduleWindow,
	mondayYyyymmddOf
} from '@class-info/backend/convex/dates';
import { TIMEZONE_OFFSET_HOURS } from '@class-info/backend/convex/config';

export {
	getNowInKst,
	parseIsoDate,
	parseYyyymmdd,
	addDaysYyyymmdd,
	yyyymmdd,
	weekdayKrUtc,
	ymdWeekday,
	weekOffsetBetween,
	relativeDayLabel,
	ddayLabel,
	isAtOrAfterDinnerEnd,
	noticeClock,
	schoolDisplayClock,
	scheduleWindow,
	mondayYyyymmddOf
};

function pad2(n: number): string {
	return String(n).padStart(2, '0');
}

export function thisMondayYyyymmdd(now: Date = getNowInKst()): string {
	return mondayYyyymmddOf(yyyymmdd(now));
}

/** YYYYMMDD from parts, month 0-indexed. */
export function ymdFromParts(year: number, month: number, day: number): string {
	return `${year}${pad2(month + 1)}${pad2(day)}`;
}

export type DateParts = { year: number; month: number; day: number; weekday: string };

/** YYYYMMDD → calendar parts with the Korean weekday; null when malformed. */
export function ymdParts(ymd: string): DateParts | null {
	const p = parseYyyymmdd(ymd);
	return p ? { year: p.y, month: p.m, day: p.d, weekday: weekdayKrUtc(p.y, p.m, p.d) } : null;
}

/** "9/21 (월)" */
export function shortDate(ymd: string): string {
	const p = ymdParts(ymd);
	return p ? `${p.month}/${p.day} (${p.weekday})` : ymd;
}

// Pinned to the school's zone, or SSR (in UTC) renders times hours off.
// `Etc/GMT-9` is UTC+9: the sign is inverted by convention.
const TIME_ZONE = `Etc/GMT${TIMEZONE_OFFSET_HOURS >= 0 ? '-' : '+'}${Math.abs(TIMEZONE_OFFSET_HOURS)}`;

export function formatAbsolute(ts: number | string | Date): string {
	return new Date(ts).toLocaleString('ko-KR', {
		timeZone: TIME_ZONE,
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
	if (minutes < 1) return '방금 전';
	if (minutes < 60) return `${minutes}분 전`;
	const hours = Math.floor(minutes / 60);
	if (hours < 24) return `${hours}시간 전`;
	const days = Math.floor(hours / 24);
	if (days < 7) return `${days}일 전`;
	if (days < 28) return `${Math.floor(days / 7)}주 전`;
	return new Date(ts).toLocaleDateString('ko-KR', {
		timeZone: TIME_ZONE,
		year: 'numeric',
		month: 'long',
		day: 'numeric'
	});
}

/** YYYY-MM-DD → "2026년 9월 21일 (월)" */
export function formatDate(dateString: string) {
	const parsed = parseIsoDate(dateString);
	if (!parsed) return dateString;
	const weekday = weekdayKrUtc(parsed.y, parsed.m, parsed.d);
	return `${parsed.y}년 ${parsed.m}월 ${parsed.d}일 (${weekday})`;
}
