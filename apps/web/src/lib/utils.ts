export function getTypeColor(type: string) {
	switch(type) {
		case '수행평가': return 'bg-neutral-700 dark:bg-neutral-600 text-white';
		default: return 'bg-neutral-500 dark:bg-neutral-500 text-white dark:text-neutral-200';
	}
}

export function getFirstLine(text: string): string {
	if (!text) return '';
	// Remove markdown formatting and get first line
	const cleanText = text
		.replace(/^#{1,6}\s+/gm, '') // Remove headers
		.replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
		.replace(/\*(.*?)\*/g, '$1') // Remove italic
		.replace(/`(.*?)`/g, '$1') // Remove inline code
		.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') // Replace links with link text
		.replace(/^\>\s+/gm, '') // Remove blockquotes
		.replace(/^\-\s+/gm, '') // Remove list markers
		.replace(/^\d+\.\s+/gm, '') // Remove numbered list markers
		.trim();
	
	const firstLine = cleanText.split('\n')[0];
	return firstLine || '';
}

// client-side grouping moved to server via convex queries

// Parse a "YYYY-MM-DD" string as a local date. `new Date("YYYY-MM-DD")` parses
// as UTC midnight, which shifts the date back a day in timezones behind UTC.
function parseLocalDate(dateString: string): Date {
	const [y, m, d] = dateString.split('-').map(Number);
	return new Date(y, (m || 1) - 1, d || 1);
}

export function generateCopyText(groups: any[]): string {
    if (!groups || groups.length === 0) return '';
    const currentAndFuture = groups; // already filtered on server
    let text = '📢수행평가 안내\n';
    currentAndFuture.forEach((group: any) => {
        const performanceNotices = (group.notices as any[]).filter((notice: any) => notice.type === '수행평가');
        if (performanceNotices.length > 0) {
            const date = parseLocalDate(performanceNotices[0].dueDate);
            const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
            const weekday = weekdays[date.getDay()];
            const dateStr = group.isToday ? '오늘' : `${date.getMonth() + 1}/${date.getDate()}(${weekday})`;
            const noticeTexts = performanceNotices.map((notice: any) => `${notice.subject} ${notice.title}`);
            text += `${dateStr} ${noticeTexts.join(', ')}\n`;
        }
    });
    return text.trim();
}

export function formatDate(dateString: string) {
	const date = parseLocalDate(dateString);
	const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
	const weekday = weekdays[date.getDay()];
	return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일 (${weekday})`;
}

