<script lang="ts">
import { useConvexClient } from 'convex-svelte';
import { api } from "@class-info/backend/convex/_generated/api";
import type { Id } from "@class-info/backend/convex/_generated/dataModel";
import { writable } from 'svelte/store';
import { enhance } from '$app/forms';
import FileUpload from '../../components/FileUpload.svelte';
import { getTypeColor } from '$lib/utils';
import { formatAbsolute, formatRelative } from '$lib/date';
import LoadingState from '../../components/LoadingState.svelte';
import type { PageData, ActionData } from './$types';

const { data, form }: { data: PageData; form: ActionData } = $props();
const client = useConvexClient();

// Bearer token for privileged mutations; present only when authenticated.
const sessionToken = $derived(data.sessionToken ?? '');

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

// Expected problems with the editor sit with the editor's actions; failures
// that come from the list sit under the header. Neither interrupts the page.
let formError = $state<string | null>(null);
let panelError = $state<string | null>(null);

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
	formError = null;
}

async function editNotice(noticeOrId: any) {
	const id = typeof noticeOrId === 'string' ? noticeOrId : String(noticeOrId?._id);
	// Always load the authoritative record. The list/overview projection is a
	// MinimalNotice (no description/files), so editing from it and saving would
	// wipe those fields — never fall back to it.
	let full: any = null;
	try {
		full = await client.query(api.notices.getById, { id: id as unknown as Id<'notices'> });
	} catch {
		full = null;
	}
	if (!full) {
		panelError = '공지를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.';
		return;
	}
	panelError = null;
	noticeForm.set({
		title: full.title || '',
		subject: full.subject || '',
		type: full.type || '숙제',
		description: typeof full.description === 'string' ? full.description : '',
		dueDate: full.dueDate || '',
		files: Array.isArray(full.files) ? full.files : []
	});
	editingNotice.set({ _id: id, ...full });
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
		formError = '제목, 과목, 마감일을 모두 입력해 주세요.';
		return;
	}
	formError = null;
	
	try {
		if ($editingNotice) {
			await client.mutation(api.notices.update, { sessionToken, id: $editingNotice._id, ...payload });
		} else {
			await client.mutation(api.notices.create, { sessionToken, ...payload });
		}
		resetForm();
	} catch (error) {
		formError = '저장하지 못했습니다. 잠시 후 다시 시도해 주세요.';
	}
}

async function handleDelete(notice: any) {
	if (!confirm('이 공지를 삭제하시겠습니까? 되돌릴 수 없습니다.')) return;
	try {
		await client.mutation(api.notices.remove, { sessionToken, id: notice._id });
		panelError = null;
	} catch (error) {
		panelError = '삭제하지 못했습니다. 잠시 후 다시 시도해 주세요.';
	}
}

// Grouped notices from overview
const allGroupedNotices = $derived(overview.data?.currentGroups || []);

// Most recent notice timestamp, or null when there are none (avoids Math.max()
// returning -Infinity → "Invalid Date").
const lastUpdatedTs = $derived.by(() => {
	const ts = allGroupedNotices
		.flatMap((g: any) => g.notices || [])
		.map((n: any) => n.updatedAt || n.createdAt)
		.filter((t: any): t is number => typeof t === 'number');
	return ts.length > 0 ? Math.max(...ts) : null;
});
</script>

<svelte:head>
	<title>관리자 페이지 - 1학년 3반 공지</title>
	<meta name="description" content="1학년 3반 공지 관리자 페이지입니다. " />

	<!-- Open Graph -->
	<meta property="og:title" content="관리자 페이지 - 1학년 3반 공지" />
	<meta property="og:description" content="1학년 3반 공지 관리자 페이지입니다. " />
	<meta property="og:type" content="website" />
	<meta property="og:site_name" content="TimeforSchool" />
	
	<!-- Twitter Card -->
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content="관리자 페이지 - 1학년 3반 공지" />
	<meta name="twitter:description" content="1학년 3반 공지 관리자 페이지입니다. " />
	
	<!-- Additional meta tags -->	
	<meta name="robots" content="noindex, nofollow" />
	
	<!-- Theme colors for iOS Safari -->
	<meta name="theme-color" content="#fafafa" media="(prefers-color-scheme: light)" />
	<meta name="theme-color" content="#0f0f0f" media="(prefers-color-scheme: dark)" />
	<meta name="msapplication-navbutton-color" content="#fafafa" />
	<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
</svelte:head>

{#if !data.isAuthenticated}
	<!-- PIN Authentication Form -->
	<div class="flex items-center justify-center min-h-[calc(100vh-8rem)] px-4">
		<div class="bg-card p-8 border border-border rounded-2xl max-w-sm w-full">
			<h1 class="text-2xl font-bold tracking-tight text-foreground mb-6 text-center">관리자 로그인</h1>

			<form method="POST" action="?/login" use:enhance>
				<div class="mb-4">
					<label for="pin" class="block text-sm font-medium mb-2 text-muted-foreground">PIN</label>
					<input
						id="pin"
						name="pin"
						type="password"
						inputmode="numeric"
						autocomplete="current-password"
						bind:value={$pin}
						class="w-full h-12 px-3.5 rounded-xl border border-border text-base bg-muted text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/50 placeholder:text-muted-foreground transition-shadow"
						placeholder="관리자 PIN을 입력하세요"
						required
					/>
				</div>

				{#if form?.error}
					<div class="mb-4 text-destructive text-sm">{form.error}</div>
				{/if}

				<button
					type="submit"
					class="pressable-lg w-full h-12 rounded-xl bg-primary font-semibold text-primary-foreground text-sm transition-opacity pointer:hover:opacity-90"
				>
					로그인
				</button>
			</form>

			<div class="mt-6 text-center">
				<a href="/" class="text-sm text-muted-foreground pointer:hover:text-foreground transition-colors">← 홈으로 돌아가기</a>
			</div>
		</div>
	</div>
{:else}
	<!-- Admin Panel -->
	<div class="min-h-screen">
		<div class="max-w-4xl mx-auto px-4 pt-5 pb-4">
		<!-- Header -->
		<div class="flex items-center justify-between gap-3 mb-5">
			<h1 class="text-xl font-bold tracking-tight text-foreground">공지 관리</h1>
			<div class="flex items-center gap-2">
				<button
					onclick={() => showForm.set(!$showForm)}
					class="pressable-lg rounded-full px-4 font-medium py-2 bg-primary text-primary-foreground text-sm transition-opacity pointer:hover:opacity-90 text-center"
				>
					{$showForm ? '취소' : '새 공지 추가'}
				</button>

				<form method="POST" action="?/logout" use:enhance class="inline">
					<button type="submit" class="pressable-lg rounded-full px-4 py-2 font-medium border border-border text-sm text-foreground transition-colors pointer:hover:bg-muted text-center">
						로그아웃
					</button>
				</form>
			</div>
		</div>

		{#if panelError}
			<p class="mb-4 rounded-xl border border-destructive/30 bg-destructive/10 px-3.5 py-2.5 text-sm font-medium text-destructive" role="alert">
				{panelError}
			</p>
		{/if}

		<!-- Form -->
		{#if $showForm}
			<div class="bg-card border border-border rounded-2xl p-4 sm:p-5 mb-6">
				<h2 class="text-lg font-semibold tracking-tight mb-4 text-foreground">
					{$editingNotice ? '공지 수정' : '새 공지 추가'}
				</h2>

				<form class="grid gap-4" onsubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
					<div>
						<label for="notice-title" class="block text-sm font-medium mb-1.5 text-muted-foreground">제목 *</label>
						<input
							id="notice-title"
							type="text"
							bind:value={$noticeForm.title}
							onkeydown={(e) => { if (e.key === 'Enter' && e.isComposing) e.preventDefault(); }}
							class="w-full h-11 px-3.5 rounded-xl border border-border text-base bg-muted text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/50 placeholder:text-muted-foreground transition-shadow break-words"
							placeholder="예: 수학 과제 제출"
						/>
					</div>

					<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
						<div>
							<label for="notice-subject" class="block text-sm font-medium mb-1.5 text-muted-foreground">과목 *</label>
							<input
								id="notice-subject"
								type="text"
								bind:value={$noticeForm.subject}
								onkeydown={(e) => { if (e.key === 'Enter' && e.isComposing) e.preventDefault(); }}
								class="w-full h-11 px-3.5 rounded-xl border border-border text-base bg-muted text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/50 placeholder:text-muted-foreground transition-shadow break-words"
								placeholder="예: 수학"
							/>
						</div>

						<div>
							<label for="notice-type" class="block text-sm font-medium mb-1.5 text-muted-foreground">종류 *</label>
							<select id="notice-type" bind:value={$noticeForm.type} class="w-full h-11 px-3 rounded-xl border border-border text-base bg-muted text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/50">
								{#each noticeTypes as type}
									<option value={type}>{type}</option>
								{/each}
							</select>
						</div>
					</div>

					<div>
						<label for="notice-date" class="block text-sm font-medium mb-1.5 text-muted-foreground">마감일 *</label>
						<input
							id="notice-date"
							type="date"
							bind:value={$noticeForm.dueDate}
							class="w-full h-11 px-3.5 rounded-xl border border-border text-base bg-muted text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
						/>
					</div>

					<div>
						<label for="notice-description" class="block text-sm font-medium mb-1.5 text-muted-foreground">설명 (마크다운 지원)</label>
						<textarea
							id="notice-description"
							bind:value={$noticeForm.description}
							rows="8"
							class="w-full px-3.5 py-2.5 rounded-xl border border-border text-base bg-muted text-foreground font-mono outline-none focus-visible:ring-2 focus-visible:ring-ring/50 placeholder:text-muted-foreground resize-none break-words overflow-hidden transition-shadow"
							placeholder="상세 설명 또는 준비물 목록&#10;&#10;마크다운 사용 가능:&#10;**굵게** *기울임* `코드`&#10;# 제목 ## 부제목&#10;- 목록 항목&#10;> 인용구&#10;![이미지](URL)&#10;유튜브 링크는 자동 변환됩니다"
						></textarea>
						<p class="text-xs text-muted-foreground mt-1.5">마크다운 문법을 사용할 수 있습니다. 상세 페이지에서 형식화되어 표시됩니다.</p>
					</div>

					<div>
						<div class="text-sm font-medium mb-1.5 text-muted-foreground">파일 첨부</div>
						<FileUpload
							files={$noticeForm.files}
							onFilesChange={handleFilesChange}
							{sessionToken}
						/>
					</div>

					{#if formError}
						<p class="text-sm font-medium text-destructive" role="alert">{formError}</p>
					{/if}

					<div class="flex gap-2">
						<button
							type="submit"
							class="pressable-lg rounded-full px-5 font-medium py-2.5 bg-primary text-primary-foreground text-sm transition-opacity pointer:hover:opacity-90"
						>
							{$editingNotice ? '수정' : '추가'}
						</button>
						<button
							type="button"
							onclick={resetForm}
							class="pressable-lg rounded-full px-5 py-2.5 font-medium border border-border text-sm text-foreground transition-colors pointer:hover:bg-muted"
						>
							취소
						</button>
					</div>
				</form>
			</div>
		{/if}

		<!-- Notice List -->
		{#if overview.isLoading}
			<LoadingState />
        {:else if overview.error}
			<div class="text-center py-8 text-destructive">
				<p>공지를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.</p>
				<button onclick={() => window.location.reload()} class="pressable mt-3 rounded-full px-4 py-2 bg-primary text-primary-foreground text-sm font-medium transition-opacity pointer:hover:opacity-90">다시 시도</button>
			</div>
        {:else}
			<!-- Current and Future Notices -->
            {#if allGroupedNotices && allGroupedNotices.length > 0}
            {#each allGroupedNotices as group (group.date)}
				<div class="mb-6">
					<h2 class="text-base font-semibold tracking-tight mb-3 text-foreground border-l-[3px] border-foreground pl-3">
						{group.displayDate}
					</h2>

                    <div class="grid gap-2">
                        {#each group.notices as notice (notice._id)}
                            <div class="bg-card border border-border rounded-xl p-3 overflow-hidden">
                                <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                                    <div class="flex-1 min-w-0">
                                        <div class="flex items-center gap-1.5 sm:gap-2 mb-1">
                                            <span class="px-1.5 py-0.5 text-xs sm:text-sm font-semibold rounded-md {getTypeColor(notice.type)}">
                                                {notice.type}
                                            </span>
                                            <span class="text-sm font-semibold text-muted-foreground">
                                                {notice.subject}
                                            </span>
                                        </div>
                                        <div class="flex items-center gap-1.5 sm:mb-1 mb-0.5">
                                            <h3 class="font-semibold text-foreground text-base break-words">
                                                {notice.title}
                                            </h3>
                                            {#if notice.hasFiles}
                                                <svg class="w-3 h-3 text-muted-foreground flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 0 1 1.414 1.414l-3 3a1 1 0 0 1-1.414 0l-3-3a1 1 0 0 1 0-1.414z" clip-rule="evenodd"/>
                                                </svg>
                                            {/if}
                                        </div>
										{#if notice.summary}
                                        <p class="text-muted-foreground text-xs sm:text-sm font-medium line-clamp-2 overflow-hidden text-ellipsis break-all">
                                            {notice.summary}
                                        </p>
										{/if}
                                    </div>
                                    <div class="flex gap-2 flex-shrink-0">
                                        <button
                                            onclick={() => editNotice(notice)}
                                            class="pressable rounded-lg px-3 py-1.5 text-sm font-medium border border-border text-foreground transition-colors pointer:hover:bg-muted"
                                        >수정</button>
                                        <button
                                            onclick={() => handleDelete(notice)}
                                            class="pressable rounded-lg px-3 py-1.5 text-sm font-medium border border-border text-destructive transition-colors pointer:hover:bg-destructive/10"
                                        >삭제</button>
                                    </div>
                                </div>
                            </div>
                        {/each}
                    </div>
				</div>
            {/each}
            {:else}
                <div class="text-center py-16 text-sm text-muted-foreground">등록된 공지가 없습니다</div>
            {/if}

			<!-- Past Notices by Month (lazy) -->
			{#if overview.data?.pastMonths && overview.data.pastMonths.length > 0}
                <div class="mt-6 pt-6 border-t border-border">
                    <h2 class="text-base sm:text-lg font-semibold tracking-tight mb-3 text-muted-foreground">지난 공지</h2>
                    {#each overview.data.pastMonths as m (m.monthKey)}
                        <details class="mb-1.5 sm:mb-2 bg-card border border-border rounded-xl overflow-hidden" open={openMonthKey === m.monthKey}>
                            <summary
                                class="px-3 sm:px-4 py-2.5 sm:py-3 cursor-pointer transition-colors pointer:hover:bg-muted text-muted-foreground font-medium text-sm sm:text-base tabular-nums"
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
		<div class="text-center py-4 text-xs text-muted-foreground border-t border-border mt-8 tabular-nums">
			{#if lastUpdatedTs !== null}
				마지막 업데이트: <span title={formatAbsolute(lastUpdatedTs)}>{formatRelative(lastUpdatedTs)}</span>
			{:else}
				마지막 업데이트: 없음
			{/if}
		</div>
	</div>
</div>
{/if}
