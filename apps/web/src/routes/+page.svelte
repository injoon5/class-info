<script lang="ts">
import { useQuery } from 'convex-svelte';
import { api } from "@class-info/backend/convex/_generated/api";
import { writable } from 'svelte/store';

const notices = useQuery(api.notices.list, {});
const showAdmin = writable(false);
const pin = writable('');

// Get the current PIN from settings
const adminPin = useQuery(api.settings.getPin, {});

function groupNoticesByDate(noticeList: any[]) {
	if (!noticeList) return [];
	
	const groups = new Map();
	const today = new Date().toDateString();
	
	noticeList.forEach(notice => {
		const dueDate = new Date(notice.dueDate);
		const dateKey = dueDate.toDateString();
		const isToday = dateKey === today;
		const isPast = dueDate < new Date() && !isToday;
		
		if (!groups.has(dateKey)) {
			groups.set(dateKey, {
				date: dateKey,
				displayDate: isToday ? '오늘' : isPast ? `${dueDate.getMonth() + 1}/${dueDate.getDate()} (지남)` : `${dueDate.getMonth() + 1}/${dueDate.getDate()}`,
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

function checkPin() {
	if (adminPin.data && $pin === adminPin.data) {
		showAdmin.set(true);
	} else {
		alert('잘못된 PIN입니다');
		pin.set('');
	}
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

$: groupedNotices = groupNoticesByDate(notices.data || []);
</script>

<div class="min-h-screen bg-[#f6f6f6]">
	<div class="max-w-4xl mx-auto p-4">
		<!-- Header -->
		<div class="flex justify-between items-center mb-8 pb-4 border-b border-[#d1d1d1]">
			<h1 class="text-2xl font-bold text-[#262626]">학급 알림판</h1>
			{#if !$showAdmin}
				<div class="flex gap-2">
					<input 
						type="password" 
						bind:value={$pin}
						placeholder="관리자 PIN"
						class="px-3 py-1 border border-[#b0b0b0] text-sm bg-white text-[#262626]"
						on:keypress={(e) => e.key === 'Enter' && checkPin()}
					/>
					<button 
						on:click={checkPin}
						class="px-3 py-1 bg-[#262626] text-white text-sm hover:bg-[#3d3d3d]"
					>
						관리
					</button>
				</div>
			{:else}
				<a href="/admin" class="px-3 py-1 bg-[#262626] text-white text-sm hover:bg-[#3d3d3d]">
					관리 페이지
				</a>
			{/if}
		</div>

		<!-- Notice Board -->
		{#if notices.isLoading}
			<div class="text-center py-8 text-[#6d6d6d]">로딩 중...</div>
		{:else if groupedNotices.length === 0}
			<div class="text-center py-8 text-[#6d6d6d]">등록된 알림이 없습니다.</div>
		{:else}
			{#each groupedNotices as group}
				<div class="mb-8">
					<h2 class="text-lg font-semibold mb-4 text-[#4f4f4f] border-l-4 border-[#888888] pl-3">
						{group.displayDate}
					</h2>
					
					<div class="grid gap-3">
						{#each group.notices as notice}
							<div class="bg-white border border-[#d1d1d1] p-4 hover:border-[#b0b0b0] transition-colors">
								<div class="flex items-start justify-between gap-4">
									<div class="flex-1">
										<div class="flex items-center gap-3 mb-2">
											<span class="px-2 py-1 text-xs font-medium rounded {getTypeColor(notice.type)}">
												{notice.type}
											</span>
											<span class="text-sm font-medium text-[#5c5c5c]">
												{notice.subject}
											</span>
										</div>
										<h3 class="font-semibold text-[#262626] mb-1">
											{notice.title}
										</h3>
										<p class="text-[#4f4f4f] text-sm">
											{notice.description}
										</p>
									</div>
								</div>
							</div>
						{/each}
					</div>
				</div>
			{/each}
		{/if}
	</div>
</div>
