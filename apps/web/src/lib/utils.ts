import { parseIsoDate, weekdayKrUtc } from './date.js';
import type { DayGroup } from '@class-info/backend/convex/validators';

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

export function generateCopyText(groups: DayGroup[]): string {
	if (groups.length === 0) return '';
	let text = '📢수행평가 안내\n';
	for (const group of groups) {
		const performanceNotices = group.notices.filter((n) => n.type === '수행평가');
		const first = performanceNotices[0];
		if (!first) continue;
		const parsed = parseIsoDate(first.dueDate);
		const weekday = parsed ? weekdayKrUtc(parsed.y, parsed.m, parsed.d) : '';
		const dateStr = group.isToday ? '오늘' : parsed ? `${parsed.m}/${parsed.d}(${weekday})` : group.displayDate;
		text += `${dateStr} ${performanceNotices.map((n) => `${n.subject} ${n.title}`).join(', ')}\n`;
	}
	return text.trim();
}

export function formatDate(dateString: string) {
	const parsed = parseIsoDate(dateString);
	if (!parsed) return dateString;
	const weekday = weekdayKrUtc(parsed.y, parsed.m, parsed.d);
	return `${parsed.y}년 ${parsed.m}월 ${parsed.d}일 (${weekday})`;
}

export function formatKoreanDueDate(dateString: string): string {
	const parsed = parseIsoDate(dateString);
	if (!parsed) return dateString;
	const weekday = weekdayKrUtc(parsed.y, parsed.m, parsed.d);
	return `${parsed.m}월 ${parsed.d}일(${weekday})까지`;
}

// A 12 KB attachment reporting itself as "0.01 MB" tells the reader nothing.
// Pick the unit that keeps at least one significant digit.
export function formatFileSize(bytes: number): string {
	if (!Number.isFinite(bytes) || bytes < 0) return '';
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
	return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
