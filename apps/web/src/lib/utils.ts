import { WEEKDAYS_KR } from './date.js';

export function getTypeColor(type: string) {
	switch (type) {
		case '수행평가': return 'bg-primary text-primary-foreground';
		case '숙제': return 'bg-muted text-foreground';
		case '준비물': return 'bg-muted text-foreground';
		case '기타': return 'bg-muted text-muted-foreground';
		default: return 'bg-muted text-muted-foreground';
	}
}

export function getFirstLine(text: string): string {
	if (!text) return '';
	// Strip markdown formatting, then take the first line.
	const cleanText = text
		.replace(/^#{1,6}\s+/gm, '')
		.replace(/\*\*(.*?)\*\*/g, '$1')
		.replace(/\*(.*?)\*/g, '$1')
		.replace(/`(.*?)`/g, '$1')
		.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
		.replace(/^>\s+/gm, '')
		.replace(/^-\s+/gm, '')
		.replace(/^\d+\.\s+/gm, '')
		.trim();

	return cleanText.split('\n')[0] || '';
}

export function generateCopyText(groups: any[]): string {
	if (!groups || groups.length === 0) return '';
	let text = '📢수행평가 안내\n';
	for (const group of groups) {
		const performanceNotices = (group.notices as any[]).filter((n: any) => n.type === '수행평가');
		if (performanceNotices.length > 0) {
			const date = new Date(performanceNotices[0].dueDate);
			const weekday = WEEKDAYS_KR[date.getDay()];
			const dateStr = group.isToday ? '오늘' : `${date.getMonth() + 1}/${date.getDate()}(${weekday})`;
			const noticeTexts = performanceNotices.map((n: any) => `${n.subject} ${n.title}`);
			text += `${dateStr} ${noticeTexts.join(', ')}\n`;
		}
	}
	return text.trim();
}

export function formatDate(dateString: string) {
	const date = new Date(dateString);
	const weekday = WEEKDAYS_KR[date.getDay()];
	return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일 (${weekday})`;
}

export function formatKoreanDueDate(dateString: string): string {
	const date = new Date(dateString);
	const weekday = WEEKDAYS_KR[date.getDay()];
	return `${date.getMonth() + 1}월 ${date.getDate()}일(${weekday})까지`;
}

// A 12 KB attachment reporting itself as "0.01 MB" tells the reader nothing.
// Pick the unit that keeps at least one significant digit.
export function formatFileSize(bytes: number): string {
	if (!Number.isFinite(bytes) || bytes < 0) return '';
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
	return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

// ── Event colors ─────────────────────────────────────────────────────────────
// The home page and the calendar draw the same events. They used to derive
// their colors separately — the calendar via Tailwind classes, the home page by
// dropping the stored color name straight into `background-color`, where
// "purple" resolved to the CSS keyword (#800080) instead of the palette hue.
// One map, so one event is one color everywhere.

export const CUSTOM_EVENT_DOT: Record<string, string> = {
	blue: 'bg-blue-500 dark:bg-blue-400',
	green: 'bg-green-500 dark:bg-green-400',
	purple: 'bg-purple-500 dark:bg-purple-400',
	orange: 'bg-orange-500 dark:bg-orange-400',
	pink: 'bg-pink-500 dark:bg-pink-400',
	teal: 'bg-teal-500 dark:bg-teal-400'
};

export function schoolEventDot(eventType?: string): string {
	if (eventType === '공휴일') return 'bg-red-500 dark:bg-red-400';
	if (eventType === '휴업일' || eventType === '재량휴업일') return 'bg-amber-500 dark:bg-amber-400';
	return 'bg-sky-500 dark:bg-sky-400';
}

export function eventDotClass(event: { source?: string; color?: string; eventType?: string }): string {
	if (event.source === 'custom') return CUSTOM_EVENT_DOT[event.color ?? ''] ?? CUSTOM_EVENT_DOT.blue;
	return schoolEventDot(event.eventType);
}
