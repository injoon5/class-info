<script lang="ts">
import { useConvexClient } from 'convex-svelte';
import { api } from "@class-info/backend/convex/_generated/api";
import type { Id } from "@class-info/backend/convex/_generated/dataModel";
import { writable } from 'svelte/store';
import { enhance } from '$app/forms';
import { onMount } from 'svelte';
import FileUpload from '../../components/FileUpload.svelte';
import type { PageData, ActionData } from './$types';

let { data, form }: { data: PageData; form: ActionData } = $props();
const client = useConvexClient();

const showForm = writable(false);
const editingNotice = writable<any>(null);

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

// Server now provides grouped current notices; fetch past months on demand
import AdminPastMonthDetails from '../../components/AdminPastMonthDetails.svelte';
import { useQuery } from 'convex-svelte';
const overview = useQuery(api.notices.overview, {});
let openMonthKey = $state<string | null>(null);

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

async function editNotice(noticeOrId: any) {
	const id = typeof noticeOrId === 'string' ? noticeOrId : String(noticeOrId?._id);
	let full: any = null;
	try {
		full = await client.query(api.notices.getById, { id: id as unknown as Id<'notices'> });
	} catch {}
	const notice = full || noticeOrId || {};
	noticeForm.set({
		title: notice.title || '',
		subject: notice.subject || '',
		type: notice.type || '숙제',
		description: typeof notice.description === 'string' ? notice.description : '',
		dueDate: notice.dueDate || '',
		files: Array.isArray(notice.files) ? notice.files : []
	});
	editingNotice.set({ _id: id, ...notice });
	showForm.set(true);
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
	const payload = {
		...formData,
		description: typeof formData.description === 'string' ? formData.description : ''
	};
	
	if (!payload.title || !payload.subject || !payload.dueDate) {
		alert('필수 항목을 모두 입력해주세요.');
		return;
	}
	
	try {
		if ($editingNotice) {
			await client.mutation(api.notices.update, { id: $editingNotice._id, ...payload });
		} else {
			await client.mutation(api.notices.create, payload);
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

// Grouped notices from overview
const allGroupedNotices = $derived(overview.data?.currentGroups || []);
</script>

<svelte:head>
	<title>관리자 페이지 - 3-4 학급 공지</title>
	<meta name="description" content="3-4 학급 공지 관리자 페이지입니다. " />

	<!-- Open Graph -->
	<meta property="og:title" content="관리자 페이지 - 3-4 학급 공지" />
	<meta property="og:description" content="3-4 학급 공지 관리자 페이지입니다. " />
	<meta property="og:type" content="website" />
	<meta property="og:site_name" content="TimeforSchool" />
	
	<!-- Twitter Card -->
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content="관리자 페이지 - 3-4 학급 공지" />
	<meta name="twitter:description" content="3-4 학급 공지 관리자 페이지입니다. " />
	
	<!-- Additional meta tags -->	
	<meta name="robots" content="noindex, nofollow" />
	
	<!-- Theme colors for iOS Safari -->
	<meta name="theme-color" content="#f5f5f5" media="(prefers-color-scheme: light)" />
	<meta name="theme-color" content="#171717" media="(prefers-color-scheme: dark)" />
	<meta name="msapplication-navbutton-color" content="#f5f5f5" />
	<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
</svelte:head>

{#if !data.isAuthenticated}
	<!-- PIN Authentication Form -->
	<div class="flex items-center justify-center min-h-[calc(100vh-5rem)] bg-neutral-100 dark:bg-neutral-900">
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
					class="pressable-lg w-full px-4 py-2 bg-neutral-800 dark:bg-neutral-300 font-semibold text-white dark:text-black text-sm hover:bg-neutral-700 dark:hover:bg-neutral-200"
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
		<div class="max-w-4xl mx-auto p-3 sm:p-4 overflow-hidden">
		<!-- Header -->
		<div class="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-3 pb-3 sm:-mt-4 ">
			<div class="flex flex-col sm:flex-row gap-2">
				<button 
					onclick={() => showForm.set(!$showForm)}
					class="px-3 pressable-lg sm:px-4 font-medium py-2 bg-neutral-800 dark:bg-neutral-300 text-white dark:text-neutral-950 text-sm hover:bg-neutral-700 dark:hover:bg-neutral-200 text-center"
				>
					{$showForm ? '취소' : '새 알림 추가'}
				</button>

				<form method="POST" action="?/logout" use:enhance class="inline">
					<button type="submit" class="px-3 pressable-lg font-medium sm:px-4 py-2 border border-neutral-400 dark:border-neutral-500 text-sm hover:bg-neutral-200 dark:hover:bg-neutral-600 text-neutral-800 dark:text-neutral-200 text-center w-full sm:w-auto">
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
				
				<div class="grid gap-3 ">
					<div>
						<label for="notice-title" class="block text-sm font-medium mb-1 text-neutral-600 dark:text-neutral-300">제목 *</label>
						<input 
							id="notice-title"
							type="text" 
							bind:value={$noticeForm.title}
							class="w-full px-2 py-1.5 border border-neutral-300 dark:border-neutral-600 text-sm bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 break-words"
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
								class="w-full px-2 py-1.5 border border-neutral-300 dark:border-neutral-600 text-sm bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 break-words"
								placeholder="예: 수학"
							/>
						</div>
						
						<div>
							<label for="notice-type" class="block text-sm font-medium mb-1 text-neutral-600 dark:text-neutral-300">종류 *</label>
							<select id="notice-type" bind:value={$noticeForm.type} class="w-full px-2 py-1.5 border border-neutral-300 dark:border-neutral-600 text-sm bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200">
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
							class="w-full px-2 py-1.5 border border-neutral-300 dark:border-neutral-600 text-sm bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200"
						/>
					</div>
					
					<div>
						<label for="notice-description" class="block text-sm font-medium mb-1 text-neutral-600 dark:text-neutral-300">설명 (마크다운 지원)</label>
						<textarea 
							id="notice-description"
							bind:value={$noticeForm.description}
							rows="8"
							class="w-full px-2 py-1.5 border border-neutral-300 dark:border-neutral-600 text-sm bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 font-mono resize-none break-words overflow-hidden"
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
							class="px-4 pressable-lg font-medium sm:pressable py-2 bg-neutral-800 dark:bg-neutral-300 text-white dark:text-neutral-950 text-sm hover:bg-neutral-700 dark:hover:bg-neutral-200"
						>
							{$editingNotice ? '수정' : '추가'}
						</button>
						<button 
							onclick={resetForm}
							class="px-4 py-2 pressable-lg sm:pressable font-medium border border-neutral-300 dark:border-neutral-500 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-600 text-neutral-800 dark:text-neutral-200"
						>
							취소
						</button>
					</div>
				</div>
			</div>
		{/if}

		<!-- Notice List -->
		{#if overview.isLoading}
			<div class="text-center py-8 text-neutral-500 dark:text-neutral-400">로딩 중...</div>
        {:else}
			<!-- Current and Future Notices -->
            {#if allGroupedNotices && allGroupedNotices.length > 0}
            {#each allGroupedNotices as group}
				<div class="mb-6">
					<h3 class="text-md font-semibold mb-3 text-neutral-600 dark:text-neutral-300 border-l-4 border-neutral-500 dark:border-neutral-400 pl-3">
						{group.displayDate}
					</h3>
					
                    <div class="grid gap-2">
                        {#each group.notices as notice}
                            <div class="bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-600 p-3 overflow-hidden">
                                <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                                    <div class="flex-1 min-w-0">
                                        <div class="flex items-center gap-1.5 sm:gap-2 mb-1">
                                            <span class="px-1.5 py-0.5 text-sm font-semibold rounded {getTypeColor(notice.type)}">
                                                {notice.type}
                                            </span>
                                            <span class="text-sm font-semibold text-neutral-600 dark:text-neutral-300">
                                                {notice.subject}
                                            </span>
                                        </div>
                                        <div class="flex items-center gap-1.5 sm:mb-1 mb-0.5">
                                            <h4 class="font-semibold text-neutral-800 dark:text-neutral-200 text-base sm:text-md break-words">
                                                {notice.title}
                                            </h4>
                                            {#if notice.hasFiles}
                                                <svg class="w-3 h-3 text-neutral-400 dark:text-neutral-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 0 1 1.414 1.414l-3 3a1 1 0 0 1-1.414 0l-3-3a1 1 0 0 1 0-1.414z" clip-rule="evenodd"/>
                                                </svg>
                                            {/if}
                                        </div>
										{#if notice.summary}
                                        <p class="text-neutral-600 dark:text-neutral-300 text-xs sm:text-sm font-medium line-clamp-2 overflow-hidden text-ellipsis break-all">
                                            {notice.summary}
                                        </p>
										{/if}
                                    </div>
                                    <div class="flex gap-2 flex-shrink-0">
                                        <button 
                                            onclick={() => editNotice(notice)}
                                            class="pressable px-2.5 py-1 sm:px-3 sm:py-1.5 text-sm border border-neutral-400 dark:border-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-600 text-neutral-800 dark:text-neutral-200"
                                        >수정</button>
                                        <button 
                                            onclick={() => handleDelete(notice)}
                                            class="pressable px-2.5 py-1 sm:px-3 sm:py-1.5 text-sm bg-neutral-800 dark:bg-neutral-300 text-white dark:text-neutral-950 hover:bg-neutral-700 dark:hover:bg-neutral-200"
                                        >삭제</button>
                                    </div>
                                </div>
                            </div>
                        {/each}
                    </div>
				</div>
            {/each}
            {:else}
                <div class="text-center py-8 text-neutral-500 dark:text-neutral-400">등록된 알림이 없습니다.</div>
            {/if}

			<!-- Past Notices by Month (lazy) -->
			{#if overview.data?.pastMonths && overview.data.pastMonths.length > 0}
                <div class="mt-6 pt-6 border-t border-neutral-200 dark:border-neutral-700">
                    <h3 class="text-base sm:text-lg font-medium mb-2 text-neutral-500 dark:text-neutral-400">지난 알림</h3>
                    {#each overview.data.pastMonths as m (m.monthKey)}
                        <details class="mb-1.5 sm:mb-2 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded" open={openMonthKey === m.monthKey}>
                            <summary 
                                class="rounded-t px-3 sm:px-4 py-2 sm:p-3 cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-700 text-neutral-500 dark:text-neutral-400 font-medium text-sm sm:text-base"
                                onclick={(e) => {
                                    e.preventDefault();
                                    openMonthKey = openMonthKey === m.monthKey ? null : m.monthKey;
                                }}
                            >
                                {m.monthName} ({m.total}개)
                            </summary>

                            {#if openMonthKey === m.monthKey}
                                {#key m.monthKey}
                                    <AdminPastMonthDetails 
                                        monthKey={m.monthKey}
                                        onEdit={(id: string) => {
                                            const all: any[] = (overview.data?.currentGroups || []).flatMap((g: any) => g.notices || []);
                                            const found = all.find((n: any) => String(n?._id) === id);
                                            if (found) {
                                                editNotice(found);
                                            } else {
                                                editNotice(id);
                                            }
                                        }}
                                        onDelete={(id: string) => handleDelete({ _id: id } as any)}
                                    />
                                {/key}
                            {/if}
                        </details>
                    {/each}
                </div>
            {/if}
		{/if}
		
		<!-- Footer -->
		<div class="text-center py-4 text-xs text-neutral-500 dark:text-neutral-400 border-t border-neutral-200 dark:border-neutral-700 mt-8">
			{#if allGroupedNotices && allGroupedNotices.length > 0}
				마지막 업데이트: {new Date(Math.max(...allGroupedNotices.flatMap(g => g.notices || []).map((n: any) => n.updatedAt || n.createdAt).filter(Boolean))).toLocaleString('ko-KR', { 
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
