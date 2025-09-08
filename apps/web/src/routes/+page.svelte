<script lang="ts">
import { useConvexClient } from 'convex-svelte';
import { api } from "@class-info/backend/convex/_generated/api";
import { writable } from 'svelte/store';
import { onMount } from 'svelte';

const notices = writable({ isLoading: true, error: undefined as any, data: [] as any[] });

const client = useConvexClient();

onMount(async () => {
	// Wait for client to initialize
	setTimeout(async () => {
		try {
			// Set up live subscriptions for real-time updates
			const unsubscribeNotices = client.onUpdate(api.notices.list, {}, (noticesData) => {
				notices.set({ isLoading: false, error: undefined, data: noticesData });
			});

			// Clean up subscriptions when component unmounts
			return () => {
				unsubscribeNotices();
			};
		} catch (error) {
			notices.set({ isLoading: false, error, data: [] });
		}
	}, 100);
});

function groupNoticesByDate(noticeList: any[]) {
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

function groupPastNoticesByMonth(pastGroups: any[]) {
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


function getTypeColor(type: string) {
	switch(type) {
		case '수행평가': return 'bg-[#3d3d3d] text-white';
		case '숙제': return 'bg-[#5c5c5c] text-white';
		case '준비물': return 'bg-[#888888] text-white';
		case '기타': return 'bg-[#b0b0b0] text-[#262626]';
		default: return 'bg-[#d1d1d1] text-[#262626]';
	}
}

function getFirstLine(text: string): string {
	if (!text) return '';
	// Remove markdown formatting and get first line
	const cleanText = text
		.replace(/^#{1,6}\s+/gm, '') // Remove headers
		.replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
		.replace(/\*(.*?)\*/g, '$1') // Remove italic
		.replace(/`(.*?)`/g, '$1') // Remove inline code
		.replace(/^\>\s+/gm, '') // Remove blockquotes
		.replace(/^\-\s+/gm, '') // Remove list markers
		.replace(/^\d+\.\s+/gm, '') // Remove numbered list markers
		.trim();
	
	const firstLine = cleanText.split('\n')[0];
	return firstLine || '';
}

function generateCopyText(notices: any[]): string {
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

async function copyToClipboard() {
	const text = generateCopyText($notices.data || []);
	if (!text) {
		alert('복사할 알림이 없습니다.');
		return;
	}
	
	try {
		await navigator.clipboard.writeText(text);
		alert('클립보드에 복사되었습니다!');
	} catch (err) {
		alert('복사에 실패했습니다.');
	}
}

$: allGroupedNotices = groupNoticesByDate($notices.data || []);
$: currentNotices = allGroupedNotices.filter(group => !group.isPast);
$: pastNotices = allGroupedNotices.filter(group => group.isPast);
$: pastNoticesByMonth = groupPastNoticesByMonth(pastNotices);

</script>

<svelte:head>
	<title>학급 공지 - 3학년 4반</title>
	<meta name="description" content="3학년 4반 학급 공지사항입니다. 수행평가, 숙제, 준비물 등 중요한 공지사항을 확인하세요." />
	
	<!-- Open Graph -->
	<meta property="og:title" content="학급 공지사항 - 3학년 4반" />
	<meta property="og:description" content="3학년 4반 학급 공지사항입니다. 수행평가, 숙제, 준비물 등 중요한 공지사항을 확인하세요." />
	<meta property="og:image" content="https://og.ij5.dev/api/og/?title=3%ED%95%99%EB%85%84%204%EB%B0%98%20%EA%B3%B5%EC%A7%80&subheading=timefor.school" />
	<meta property="og:url" content="https://timefor.school" />
	<meta property="og:type" content="website" />
	<meta property="og:site_name" content="학급 공지사항" />

	<!-- Twitter Card -->
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content="학급 공지사항 - 3학년 4반" />
	<meta name="twitter:description" content="3학년 4반 학급 공지사항입니다. 수행평가, 숙제, 준비물 등 중요한 공지사항을 확인하세요." />
	<meta name="twitter:image" content="https://og.ij5.dev/api/og/?title=3%ED%95%99%EB%85%84%204%EB%B0%98%20%EA%B3%B5%EC%A7%80&subheading=timefor.school" />
</svelte:head>

<div class="min-h-screen bg-[#f6f6f6]">
	<div class="max-w-4xl mx-auto p-4">
		<!-- Header -->
		<div class="flex justify-center items-center mb-6 sm:mb-8 pb-3 sm:pb-4 border-b border-[#d1d1d1]">
			<h1 class="text-xl sm:text-2xl font-bold text-[#262626]">3-4 공지</h1>
		</div>

		<!-- Notice Board -->
		{#if $notices.isLoading}
			<div class="text-center py-8 text-[#6d6d6d]">로딩 중...</div>
		{:else if $notices.error}
			<div class="text-center py-8 text-red-600">
				<p>데이터를 불러오는 중 오류가 발생했습니다.</p>
				<p class="text-sm mt-2">{$notices.error.toString()}</p>
				<button on:click={() => window.location.reload()} class="mt-4 px-4 py-2 bg-[#262626] text-white text-sm hover:bg-[#3d3d3d]">
					다시 시도
				</button>
			</div>
		{:else if allGroupedNotices.length === 0}
			<div class="text-center py-8 text-[#6d6d6d]">등록된 알림이 없습니다.</div>
		{:else}
			<!-- Current and Future Notices -->
			{#each currentNotices as group}
				<div class="mb-4 sm:mb-6">
					<h2 class="text-sm sm:text-lg font-semibold mb-2 sm:mb-4 text-[#4f4f4f] border-l-4 border-[#888888] pl-3">
						{group.displayDate}
					</h2>
					
					<div class="grid gap-1.5 sm:gap-2">
						{#each group.notices as notice}
							<div class="bg-white border border-[#d1d1d1] p-2 sm:p-3 hover:border-[#b0b0b0] transition-colors cursor-pointer" on:click={() => window.location.href = `/notice/${notice._id}`}>
								<div class="flex items-start justify-between gap-2 sm:gap-4">
									<div class="flex-1">
										<div class="flex items-center gap-1.5 sm:gap-2 mb-1">
											<span class="px-1 py-0.5 sm:py-1 text-xs font-medium rounded {getTypeColor(notice.type)}">
												{notice.type}
											</span>
											<span class="text-xs sm:text-sm  font-bold text-[#5c5c5c]">
												{notice.subject}
											</span>
										</div>
										<h3 class="font-semibold text-sm sm:text-base text-[#262626] mb-0.5 sm:mb-1">
											{notice.title}
										</h3>
										<p class="text-[#4f4f4f] text-xs sm:text-sm truncate">
											{getFirstLine(notice.description)}
										</p>
									</div>
									<div class="text-[#b0b0b0] text-sm">
										→
									</div>
								</div>
							</div>
						{/each}
					</div>
				</div>
			{/each}

			<!-- Past Notices by Month -->
			{#if pastNoticesByMonth.length > 0}
				<div class="mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-[#e0e0e0]">
					<h2 class="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-[#6d6d6d]">지난 알림</h2>
					{#each pastNoticesByMonth as monthGroup}
						<details class="mb-3 sm:mb-4 bg-white border border-[#e0e0e0] rounded">
							<summary class="px-3 sm:px-4 py-2 sm:py-3 cursor-pointer hover:bg-[#f9f9f9] text-[#6d6d6d] font-medium text-sm sm:text-base">
								{monthGroup.monthName} ({monthGroup.groups.reduce((sum, g) => sum + g.notices.length, 0)}개)
							</summary>
							<div class="px-3 sm:px-4 pb-3 sm:pb-4">
								{#each monthGroup.groups as group}
									<div class="mb-3 sm:mb-4 last:mb-0">
										<h3 class="text-xs sm:text-sm font-medium mb-1.5 sm:mb-2 text-[#888888] border-l-2 border-[#d1d1d1] pl-2">
											{group.displayDate}
										</h3>
										<div class="grid gap-1.5 sm:gap-2">
											{#each group.notices as notice}
												<div class="bg-[#f9f9f9] border border-[#e0e0e0] p-2 sm:p-3 opacity-75 hover:opacity-90 cursor-pointer transition-opacity" on:click={() => window.location.href = `/notice/${notice._id}`}>
													<div class="flex items-start justify-between gap-2 sm:gap-4">
														<div class="flex-1">
															<div class="flex items-center gap-1.5 sm:gap-2 mb-0.5 sm:mb-1">
																<span class="px-1 py-0.5 text-xs font-medium rounded {getTypeColor(notice.type)} opacity-75">
																	{notice.type}
																</span>
																<span class="text-xs font-medium text-[#888888]">
																	{notice.subject}
																</span>
															</div>
															<h4 class="font-medium text-[#666666] mb-0.5 text-xs sm:text-sm">
																{notice.title}
															</h4>
															<p class="text-[#888888] text-xs truncate">
																{getFirstLine(notice.description)}
															</p>
														</div>
														<div class="text-[#c0c0c0] text-sm opacity-75">
															→
														</div>
													</div>
												</div>
											{/each}
										</div>
									</div>
								{/each}
							</div>
						</details>
					{/each}
				</div>
			{/if}
		{/if}
		
		<!-- Footer -->
		<div class="text-center py-3 sm:py-4 text-xs text-[#888888] border-t border-[#e0e0e0] mt-6 sm:mt-8">
			{#if $notices.data && $notices.data.length > 0}
				마지막 업데이트: {new Date(Math.max(...$notices.data.map(n => n.updatedAt || n.createdAt).filter(Boolean))).toLocaleString('ko-KR', { 
					year: 'numeric', 
					month: 'long', 
					day: 'numeric', 
					hour: '2-digit', 
					minute: '2-digit' 
				})}
			{:else}
				마지막 업데이트: 데이터 없음
			{/if}
		</div>

		<!-- Buttons -->
		<div class="text-center py-3 sm:py-4 text-xs text-[#888888] space-y-1.5 sm:space-y-2">
			<div>
				<button 
					on:click={copyToClipboard}
					class="text-xs text-[#888888] hover:text-[#262626] underline"
				>
					알림 복사
				</button>
			</div>
			<div>
				<a href="/admin" class="text-xs text-[#888888] hover:text-[#262626] underline">
					관리자
				</a>
			</div>
		</div>
	</div>
</div>
