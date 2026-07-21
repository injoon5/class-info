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
