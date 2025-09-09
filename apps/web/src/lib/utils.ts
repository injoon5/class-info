export function getTypeColor(type: string) {
	switch(type) {
		case '수행평가': return 'bg-neutral-700 dark:bg-neutral-500 text-white';
		case '숙제': return 'bg-neutral-600 dark:bg-neutral-400 text-white';
		case '준비물': return 'bg-neutral-500 dark:bg-neutral-400 text-white';
		case '기타': return 'bg-neutral-400 dark:bg-neutral-500 text-neutral-800 dark:text-neutral-200';
		default: return 'bg-neutral-300 dark:bg-neutral-500 text-neutral-800 dark:text-neutral-200';
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

export function groupNoticesByDate(noticeList: any[]) {
	if (!noticeList) return [];
	
	const groups = new Map();
	const now = new Date();
	const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
	const todayString = today.toDateString();
	const currentHour = now.getHours();
	
	noticeList.forEach(notice => {
		const dueDate = new Date(notice.dueDate);
		const dateKey = dueDate.toDateString();
		const isToday = dateKey === todayString;
		
		// Consider it past if:
		// 1. Date is before today, OR
		// 2. Date is today but it's after 4pm (16:00)
		const isPast = dueDate < today || (isToday && currentHour >= 16);
		
		// Add weekday
		const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
		const weekday = weekdays[dueDate.getDay()];
		
		let displayDate;
		if (isToday) {
			displayDate = '오늘';
		} else {
			displayDate = `${dueDate.getMonth() + 1}/${dueDate.getDate()} (${weekday})`;
		}
		
		if (!groups.has(dateKey)) {
			groups.set(dateKey, {
				date: dateKey,
				displayDate,
				isToday,
				isPast,
				notices: []
			});
		}
		groups.get(dateKey).notices.push(notice);
	});
	
	return Array.from(groups.values()).sort((a, b) => 
		new Date(a.date).getTime() - new Date(b.date).getTime()
	);
}

export function groupPastNoticesByMonth(pastGroups: any[]) {
	const monthGroups = new Map();
	
	pastGroups.forEach(group => {
		const date = new Date(group.date);
		const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
		const monthName = `${date.getFullYear()}년 ${date.getMonth() + 1}월`;
		
		if (!monthGroups.has(monthKey)) {
			monthGroups.set(monthKey, {
				monthName,
				groups: []
			});
		}
		monthGroups.get(monthKey).groups.push(group);
	});
	
	return Array.from(monthGroups.values()).sort((a, b) => {
		const [yearA, monthA] = a.monthName.match(/(\d+)년 (\d+)월/).slice(1).map(Number);
		const [yearB, monthB] = b.monthName.match(/(\d+)년 (\d+)월/).slice(1).map(Number);
		return (yearB - yearA) || (monthB - monthA); // Most recent first
	});
}

export function generateCopyText(notices: any[]): string {
	if (!notices || notices.length === 0) return '';
	
	const grouped = groupNoticesByDate(notices);
	const currentAndFuture = grouped.filter(group => !group.isPast);
	
	if (currentAndFuture.length === 0) return '';
	
	let text = '📢수행평가 안내\n';
	
	currentAndFuture.forEach(group => {
		const performanceNotices = group.notices.filter(notice => notice.type === '수행평가');
		
		if (performanceNotices.length > 0) {
			const date = new Date(performanceNotices[0].dueDate);
			const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
			const weekday = weekdays[date.getDay()];
			const dateStr = group.isToday ? '오늘' : `${date.getMonth() + 1}/${date.getDate()}(${weekday})`;
			
			// Combine all notices for this date into one line
			const noticeTexts = performanceNotices.map(notice => `${notice.subject} ${notice.title}`);
			text += `${dateStr} ${noticeTexts.join(', ')}\n`;
		}
	});
	
	return text.trim();
}

export function formatDate(dateString: string) {
	const date = new Date(dateString);
	const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
	const weekday = weekdays[date.getDay()];
	return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일 (${weekday})`;
}

export function truncateTitle(title: string): string {
	if (title.length <= 18) return title;
	return title.substring(0, 18);
}

export function formatKoreanDueDate(dateString: string): string {
	const date = new Date(dateString);
	const month = date.getMonth() + 1;
	const day = date.getDate();
	const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
	const weekday = weekdays[date.getDay()];
	return `${month}월 ${day}일(${weekday})까지`;
}

