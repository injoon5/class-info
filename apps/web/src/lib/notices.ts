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

// The 수행평가 digest the class chat gets. Empty when there is none to share.
export function generateCopyText(groups: DayGroup[]): string {
	const lines: string[] = [];
	for (const group of groups) {
		const due = group.notices.filter((n) => n.type === '수행평가');
		const first = due[0];
		if (!first) continue;
		const parsed = parseIsoDate(first.dueDate);
		const date = group.isToday
			? '오늘'
			: parsed
				? `${parsed.m}/${parsed.d}(${weekdayKrUtc(parsed.y, parsed.m, parsed.d)})`
				: group.displayDate;
		lines.push(`${date} ${due.map((n) => `${n.subject} ${n.title}`).join(', ')}`);
	}
	return lines.length > 0 ? `📢수행평가 안내\n${lines.join('\n')}` : '';
}
