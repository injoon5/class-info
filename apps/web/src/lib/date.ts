// Display formatting for instants and notice dates. Calendar math lives in
// the backend's dates module, shared with the server.

import { ymdFromIso, ymdParts } from '@class-info/backend/convex/dates';
import { TIMEZONE_OFFSET_HOURS } from '@class-info/backend/convex/config';

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
export function formatDate(iso: string): string {
	const p = ymdParts(ymdFromIso(iso) ?? '');
	return p ? `${p.year}년 ${p.month}월 ${p.day}일 (${p.weekday})` : iso;
}
