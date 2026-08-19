import { parseIsoDate, weekdayKrUtc } from '$lib/date';
import type { DayGroup, MinimalNotice } from '@class-info/backend/convex/validators';

export type { DayGroup, MinimalNotice };

export function noticeTypeClass(type: MinimalNotice['type']) {
	switch (type) {
		case '수행평가': return 'bg-primary text-primary-foreground';
		case '숙제': return 'bg-muted text-foreground';
		case '준비물': return 'bg-muted text-foreground';
		case '기타': return 'bg-muted text-muted-foreground';
		default: {
			const _exhaustive: never = type;
			void _exhaustive;
			return 'bg-muted text-muted-foreground';
		}
	}
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
