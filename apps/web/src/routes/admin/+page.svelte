<script lang="ts">
import { useConvexClient } from 'convex-svelte';
import { api } from "@class-info/backend/convex/_generated/api";
import { writable } from 'svelte/store';
import { enhance } from '$app/forms';
import { onMount } from 'svelte';
import FileUpload from '../../components/FileUpload.svelte';
import type { PageData, ActionData } from './$types';

let { data, form }: { data: PageData; form: ActionData } = $props();

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

const showForm = writable(false);
const editingNotice = writable(null);

const noticeForm = writable({
	title: '',
	subject: '',
	type: '숙제' as '수행평가' | '숙제' | '준비물' | '기타',
	description: '',
	dueDate: '',
	files: [] as any[]
});

// PIN form state
const pin = writable('');

const noticeTypes = ['수행평가', '숙제', '준비물', '기타'] as const;

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

function resetForm() {
	noticeForm.set({
		title: '',
		subject: '',
		type: '숙제',
		description: '',
		dueDate: '',
		files: []
	});
	editingNotice.set(null);
	showForm.set(false);
}

function editNotice(notice: any) {
	noticeForm.set({
		title: notice.title,
		subject: notice.subject,
		type: notice.type,
		description: notice.description,
		dueDate: notice.dueDate,
		files: notice.files || []
	});
	editingNotice.set(notice);
	showForm.set(true);
	
	// Wait for the form to render, then smooth scroll to top
	setTimeout(() => {
		window.scrollTo({ top: 0, behavior: 'smooth' });
	}, 100);
}

function handleFilesChange(fileIds: any[]) {
	noticeForm.update(form => ({
		...form,
		files: fileIds
	}));
}

async function handleSubmit() {
	const formData = $noticeForm;
	
	if (!formData.title || !formData.subject || !formData.dueDate) {
		alert('필수 항목을 모두 입력해주세요.');
		return;
	}
	
	try {
		if ($editingNotice) {
			await client.mutation(api.notices.update, {
				id: $editingNotice._id,
				...formData
			});
		} else {
			await client.mutation(api.notices.create, formData);
		}
		resetForm();
	} catch (error) {
		alert('저장 중 오류가 발생했습니다.');
	}
}

async function handleDelete(notice: any) {
	if (confirm('정말 삭제하시겠습니까?')) {
		try {
			await client.mutation(api.notices.remove, { id: notice._id });
		} catch (error) {
			alert('삭제 중 오류가 발생했습니다.');
		}
	}
}

function formatDate(dateStr: string) {
	const date = new Date(dateStr);
	return `${date.getMonth() + 1}/${date.getDate()}`;
}

function getTypeColor(type: string) {
	switch(type) {
		case '수행평가': return 'bg-neutral-700 dark:bg-neutral-500 text-white';
		case '숙제': return 'bg-neutral-600 dark:bg-neutral-400 text-white';
		case '준비물': return 'bg-neutral-500 dark:bg-neutral-400 text-white';
		case '기타': return 'bg-neutral-400 dark:bg-neutral-500 text-neutral-800 dark:text-neutral-200';
		default: return 'bg-neutral-300 dark:bg-neutral-500 text-neutral-800 dark:text-neutral-200';
	}
}

const allGroupedNotices = $derived(groupNoticesByDate($notices.data || []));
const currentNotices = $derived(allGroupedNotices.filter(group => !group.isPast));
const pastNotices = $derived(allGroupedNotices.filter(group => group.isPast));
const pastNoticesByMonth = $derived(groupPastNoticesByMonth(pastNotices));
</script>

<svelte:head>
	<title>관리자 페이지 - 학급 공지</title>
	<meta name="description" content="학급 공지 관리자 페이지입니다. 공지사항을 작성하고 관리할 수 있습니다." />

	<!-- Open Graph -->
	<meta property="og:title" content="관리자 페이지 - 학급 공지" />
	<meta property="og:description" content="학급 공지 관리자 페이지입니다. 공지사항을 작성하고 관리할 수 있습니다." />
	<meta property="og:type" content="website" />
	<meta property="og:site_name" content="학급 공지" />
	
	<!-- Twitter Card -->
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content="관리자 페이지 - 학급 공지" />
	<meta name="twitter:description" content="학급 공지 관리자 페이지입니다. 공지사항을 작성하고 관리할 수 있습니다." />
	
	<!-- Additional meta tags -->
	<meta name="keywords" content="학급, 관리자, 공지사항, 작성" />
	<meta name="robots" content="noindex, nofollow" />
	
	<!-- Theme colors for iOS Safari -->
	<meta name="theme-color" content="#f5f5f5" media="(prefers-color-scheme: light)" />
	<meta name="theme-color" content="#171717" media="(prefers-color-scheme: dark)" />
	<meta name="msapplication-navbutton-color" content="#f5f5f5" />
	<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
</svelte:head>

{#if !data.isAuthenticated}
	<!-- PIN Authentication Form -->
	<div class="min-h-screen bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center">
		<div class="bg-white dark:bg-neutral-800 p-8 border border-neutral-300 dark:border-neutral-600 max-w-md w-full mx-4">
			<h1 class="text-2xl font-bold text-neutral-800 dark:text-neutral-200 mb-6 text-center">관리자 로그인</h1>
			
			<form method="POST" action="?/login" use:enhance>
				<div class="mb-4">
					<label for="pin" class="block text-sm font-medium mb-2 text-neutral-600 dark:text-neutral-300">PIN</label>
					<input 
						id="pin"
						name="pin"
						type="password" 
						bind:value={$pin}
						class="w-full px-3 py-2 border border-neutral-400 dark:border-neutral-500 text-sm bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200"
						placeholder="관리자 PIN을 입력하세요"
						required
					/>
				</div>
				
				{#if form?.error}
					<div class="mb-4 text-red-600 text-sm">{form.error}</div>
				{/if}
				
				<button 
					type="submit"
					class="w-full px-4 py-2 bg-neutral-800 dark:bg-neutral-300 text-white text-sm hover:bg-neutral-700 dark:hover:bg-neutral-200"
				>
					로그인
				</button>
			</form>
			
			<div class="mt-6 text-center">
				<a href="/" class="text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200">← 홈으로 돌아가기</a>
			</div>
		</div>
	</div>
{:else}
	<!-- Admin Panel -->
	<div class="min-h-screen bg-neutral-100 dark:bg-neutral-900">
		<div class="max-w-4xl mx-auto p-3 sm:p-4">
		<!-- Header -->
		<div class="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6 pb-3 border-b border-neutral-300 dark:border-neutral-600">
			<h1 class="text-xl sm:text-2xl font-bold text-neutral-800 dark:text-neutral-200">관리자 페이지</h1>
			<div class="flex flex-col sm:flex-row gap-2">
				<button 
					onclick={() => showForm.set(!$showForm)}
					class="px-3 sm:px-4 py-2 bg-neutral-800 dark:bg-neutral-300 text-white dark:text-neutral-950 text-sm hover:bg-neutral-700 dark:hover:bg-neutral-200 text-center"
				>
					{$showForm ? '취소' : '새 알림 추가'}
				</button>
				<a href="/" class="px-3 sm:px-4 py-2 border border-neutral-400 dark:border-neutral-500 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-600 text-neutral-800 dark:text-neutral-200 text-center">
			홈으로
				</a>
				<form method="POST" action="?/logout" use:enhance class="inline">
					<button type="submit" class="px-3 sm:px-4 py-2 border border-neutral-400 dark:border-neutral-500 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-600 text-neutral-800 dark:text-neutral-200 text-center w-full sm:w-auto">
						로그아웃
					</button>
				</form>
			</div>
		</div>

		<!-- Form -->
		{#if $showForm}
			<div class="bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-600 p-4 mb-6">
				<h2 class="text-lg font-semibold mb-3 text-neutral-800 dark:text-neutral-200">
					{$editingNotice ? '알림 수정' : '새 알림 추가'}
				</h2>
				
				<div class="grid gap-3">
					<div>
						<label for="notice-title" class="block text-sm font-medium mb-1 text-neutral-600 dark:text-neutral-300">제목 *</label>
						<input 
							id="notice-title"
							type="text" 
							bind:value={$noticeForm.title}
							class="w-full px-2 py-1.5 border border-neutral-400 dark:border-neutral-500 text-sm bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200"
							placeholder="예: 수학 과제 제출"
						/>
					</div>
					
					<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
						<div>
							<label for="notice-subject" class="block text-sm font-medium mb-1 text-neutral-600 dark:text-neutral-300">과목 *</label>
							<input 
								id="notice-subject"
								type="text" 
								bind:value={$noticeForm.subject}
								class="w-full px-2 py-1.5 border border-neutral-400 dark:border-neutral-500 text-sm bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200"
								placeholder="예: 수학"
							/>
						</div>
						
						<div>
							<label for="notice-type" class="block text-sm font-medium mb-1 text-neutral-600 dark:text-neutral-300">종류 *</label>
							<select id="notice-type" bind:value={$noticeForm.type} class="w-full px-2 py-1.5 border border-neutral-400 dark:border-neutral-500 text-sm bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200">
								{#each noticeTypes as type}
									<option value={type}>{type}</option>
								{/each}
							</select>
						</div>
					</div>
					
					<div>
						<label for="notice-date" class="block text-sm font-medium mb-1 text-neutral-600 dark:text-neutral-300">마감일 *</label>
						<input 
							id="notice-date"
							type="date" 
							bind:value={$noticeForm.dueDate}
							class="w-full px-2 py-1.5 border border-neutral-400 dark:border-neutral-500 text-sm bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200"
						/>
					</div>
					
					<div>
						<label for="notice-description" class="block text-sm font-medium mb-1 text-neutral-600 dark:text-neutral-300">설명 (마크다운 지원)</label>
						<textarea 
							id="notice-description"
							bind:value={$noticeForm.description}
							rows="8"
							class="w-full px-2 py-1.5 border border-neutral-400 dark:border-neutral-500 text-sm bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 font-mono"
							placeholder="상세 설명 또는 준비물 목록&#10;&#10;마크다운 사용 가능:&#10;**굵게** *기울임* `코드`&#10;# 제목 ## 부제목&#10;- 목록 항목&#10;> 인용구&#10;![이미지](URL)&#10;유튜브 링크는 자동 변환됩니다"
						></textarea>
						<p class="text-xs text-neutral-500 dark:text-neutral-400 mt-1">마크다운 문법을 사용할 수 있습니다. 상세 페이지에서 형식화되어 표시됩니다.</p>
					</div>
					
					<div>
						<div class="text-sm font-medium mb-1 text-neutral-600 dark:text-neutral-300">파일 첨부</div>
						<FileUpload 
							files={$noticeForm.files} 
							onFilesChange={handleFilesChange}
						/>
					</div>
					
					<div class="flex flex-col sm:flex-row gap-2">
						<button 
							onclick={handleSubmit}
							class="px-3 py-1.5 bg-neutral-800 dark:bg-neutral-300 text-white dark:text-neutral-950 text-sm hover:bg-neutral-700 dark:hover:bg-neutral-200"
						>
							{$editingNotice ? '수정' : '추가'}
						</button>
						<button 
							onclick={resetForm}
							class="px-3 py-1.5 border border-neutral-400 dark:border-neutral-500 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-600 text-neutral-800 dark:text-neutral-200"
						>
							취소
						</button>
					</div>
				</div>
			</div>
		{/if}

		<!-- Notice List -->
		{#if $notices.isLoading}
			<div class="text-center py-8 text-neutral-500 dark:text-neutral-400">로딩 중...</div>
		{:else if allGroupedNotices.length === 0}
			<div class="text-center py-8 text-neutral-500 dark:text-neutral-400">등록된 알림이 없습니다.</div>
		{:else}
			<!-- Current and Future Notices -->
			{#each currentNotices as group}
				<div class="mb-6">
					<h3 class="text-md font-semibold mb-3 text-neutral-600 dark:text-neutral-300 border-l-4 border-neutral-500 dark:border-neutral-400 pl-3">
						{group.displayDate}
					</h3>
					
					<div class="grid gap-2">
						{#each group.notices as notice}
							<div class="bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-600 p-3">
								<div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
									<div class="flex-1">
										<div class="flex items-center gap-2 mb-1.5">
											<span class="px-2 py-1 text-xs font-medium rounded {getTypeColor(notice.type)}">
												{notice.type}
											</span>
											<span class="text-sm font-medium text-neutral-600 dark:text-neutral-300">
												{notice.subject}
											</span>

										</div>
										<div class="flex items-center gap-1.5 mb-0.5">
											<h4 class="font-semibold text-neutral-800 dark:text-neutral-200">
												{notice.title}
											</h4>
											{#if notice.files && notice.files.length > 0}
												<svg class="w-3 h-3 text-neutral-400 dark:text-neutral-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
													<path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd"/>
												</svg>
											{/if}
										</div>
										<p class="text-neutral-600 dark:text-neutral-300 text-sm line-clamp-2">
											{notice.description}
										</p>
									</div>
									<div class="flex gap-2">
										<button 
											onclick={() => editNotice(notice)}
											class="px-3 py-1 text-xs border border-neutral-400 dark:border-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-600 text-neutral-800 dark:text-neutral-200"
										>
											수정
										</button>
										<button 
											onclick={() => handleDelete(notice)}
											class="px-3 py-1 text-xs bg-neutral-800 dark:bg-neutral-300 text-white dark:text-neutral-950 hover:bg-neutral-700 dark:hover:bg-neutral-200"
										>
											삭제
										</button>
									</div>
								</div>
							</div>
						{/each}
					</div>
				</div>
			{/each}

			<!-- Past Notices by Month -->
			{#if pastNoticesByMonth.length > 0}
				<div class="mt-6 pt-6 border-t border-neutral-200 dark:border-neutral-700">
					<h3 class="text-md font-semibold mb-4 text-neutral-500 dark:text-neutral-400">지난 알림</h3>
					{#each pastNoticesByMonth as monthGroup}
						<details class="mb-3 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded">
							<summary class="px-4 py-3 cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-700 text-neutral-500 dark:text-neutral-400 font-medium">
								{monthGroup.monthName} ({monthGroup.groups.reduce((sum: number, g: any) => sum + g.notices.length, 0)}개)
							</summary>
							<div class="px-4 pb-4">
								{#each monthGroup.groups as group}
									<div class="mb-3 last:mb-0">
										<h4 class="text-sm font-medium mb-2 text-neutral-500 dark:text-neutral-400 border-l-2 border-neutral-300 dark:border-neutral-600 pl-2">
											{group.displayDate}
										</h4>
										<div class="grid gap-2">
											{#each group.notices as notice}
												<div class="bg-neutral-50 dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-700 p-3 opacity-75">
													<div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
														<div class="flex-1">
															<div class="flex items-center gap-2 mb-1">
																<span class="px-1.5 py-0.5 text-xs font-medium rounded {getTypeColor(notice.type)} opacity-75">
																	{notice.type}
																</span>
																<span class="text-xs font-medium text-neutral-500 dark:text-neutral-400">
																	{notice.subject}
																</span>
																<span class="text-xs text-neutral-400 dark:text-neutral-500">
																	마감: {formatDate(notice.dueDate)}
																</span>
															</div>
															<div class="flex items-center gap-1.5 mb-0.5">
																<h5 class="font-medium text-neutral-600 dark:text-neutral-300 text-sm">
																	{notice.title}
																</h5>
																{#if notice.files && notice.files.length > 0}
																	<svg class="w-3 h-3 text-neutral-400 dark:text-neutral-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
																		<path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd"/>
																	</svg>
																{/if}
															</div>
															<p class="text-neutral-500 dark:text-neutral-400 text-xs line-clamp-2">
																{notice.description}
															</p>
														</div>
														<div class="flex gap-1">
															<button 
																onclick={() => editNotice(notice)}
																class="px-2 py-1 text-xs border border-neutral-300 dark:border-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-600 text-neutral-600 dark:text-neutral-300 opacity-75"
															>
																수정
															</button>
															<button 
																onclick={() => handleDelete(notice)}
																class="px-2 py-1 text-xs bg-neutral-600 dark:bg-neutral-400 text-white hover:bg-neutral-700 dark:hover:bg-neutral-300 opacity-75"
															>
																삭제
															</button>
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
		<div class="text-center py-4 text-xs text-neutral-500 dark:text-neutral-400 border-t border-neutral-200 dark:border-neutral-700 mt-8">
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
	</div>
</div>
{/if}
