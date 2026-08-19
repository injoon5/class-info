<script lang="ts">
import { useConvexClient } from 'convex-svelte';
import { api } from "@class-info/backend/convex/_generated/api";
import type { Id } from "@class-info/backend/convex/_generated/dataModel";
import { enhance } from '$app/forms';
import FileUpload from '../../components/FileUpload.svelte';
import { getTypeColor } from '$lib/utils';
import { formatAbsolute, formatRelative } from '$lib/date';
import type { DayGroup, MinimalNotice } from '@class-info/backend/convex/validators';
import LoadingState from '../../components/LoadingState.svelte';
import PillButton from '../../components/PillButton.svelte';
import ConfirmDeleteActions from '../../components/ConfirmDeleteActions.svelte';
import AdminPastMonthDetails from '../../components/AdminPastMonthDetails.svelte';
import DisclosureCaret from '../../components/DisclosureCaret.svelte';
import { autosize } from '$lib/actions/autosize';
import { onMount } from 'svelte';
import { SvelteSet } from 'svelte/reactivity';
import { fade, slide } from 'svelte/transition';
import { flip } from 'svelte/animate';
import { fadeIn, fadeOut, flipMove, slideNone, slideY, slideYOut } from '$lib/transitions';
import { useQuery } from 'convex-svelte';
import type { PageData, ActionData } from './$types';

const { data, form }: { data: PageData; form: ActionData } = $props();
const client = useConvexClient();

// Bearer token for privileged mutations; present only when authenticated.
const sessionToken = $derived(data.sessionToken ?? '');

// null = closed, 'new' = adding, anything else = the id of the notice being
// edited. One value, so the editor can never be open on nothing or open twice.
let editorTarget = $state<string | null>(null);
const isEditing = $derived(editorTarget !== null && editorTarget !== 'new');

// Deleting is confirmed in the row that owns the notice, not in a modal.
let confirmingDeleteId = $state<string | null>(null);
let dismissedIds = new SvelteSet<string>();

let noticeForm = $state({
	title: '',
	subject: '',
	type: '숙제' as MinimalNotice['type'],
	description: '',
	dueDate: '',
	files: [] as Id<'files'>[]
});

// PIN form state
let pin = $state('');

const noticeTypes = ['수행평가', '숙제', '준비물', '기타'] as const;

// Server now provides grouped current notices; fetch past months on demand
const overview = useQuery(
	api.notices.overview,
	() => ({ cutoff: data.cutoff, today: data.today }),
	() => ({
		initialData: data.overview,
		keepPreviousData: true
	})
);
let openMonthKey = $state<string | null>(null);

// Expected problems with the editor sit with the editor's actions; failures
// that come from the list sit under the header. Neither interrupts the page.
let formError = $state<string | null>(null);
let panelError = $state<string | null>(null);

const EMPTY_NOTICE = {
	title: '',
	subject: '',
	type: '숙제' as MinimalNotice['type'],
	description: '',
	dueDate: '',
	files: [] as Id<'files'>[]
};

// Toggling the header button must open an empty editor, not inherit whatever
// notice happened to be open.
function startNewNotice() {
	if (editorTarget === 'new') {
		resetForm();
		return;
	}
	noticeForm = { ...EMPTY_NOTICE };
	formError = null;
	confirmingDeleteId = null;
	editorTarget = 'new';
}

function resetForm() {
	noticeForm = { ...EMPTY_NOTICE };
	editorTarget = null;
	formError = null;
}

async function editNotice(id: Id<'notices'>) {
	// Always load the authoritative record. The list/overview projection is a
	// MinimalNotice (no description/files), so editing from it and saving would
	// wipe those fields — never fall back to it.
	try {
		const full = await client.query(api.notices.getById, { id });
		if (!full) {
			panelError = '공지를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.';
			return;
		}
		panelError = null;
		noticeForm = {
			title: full.title || '',
			subject: full.subject || '',
			type: full.type || '숙제',
			description: typeof full.description === 'string' ? full.description : '',
			dueDate: full.dueDate || '',
			files: Array.isArray(full.files) ? full.files : []
		};
		editorTarget = id;
		formError = null;
		confirmingDeleteId = null;
	} catch {
		panelError = '공지를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.';
	}
}

function handleFilesChange(fileIds: Id<'files'>[]) {
	noticeForm = { ...noticeForm, files: fileIds };
}

async function handleSubmit() {
	const payload = {
		...noticeForm,
		description: typeof noticeForm.description === 'string' ? noticeForm.description : ''
	};
	
	if (!payload.title || !payload.subject || !payload.dueDate) {
		formError = '제목, 과목, 마감일을 모두 입력해 주세요.';
		return;
	}
	formError = null;
	
	try {
		if (isEditing) {
			await client.mutation(api.notices.update, { sessionToken, id: editorTarget as Id<'notices'>, ...payload });
		} else {
			await client.mutation(api.notices.create, { sessionToken, ...payload });
		}
		resetForm();
	} catch {
		formError = '저장하지 못했습니다. 잠시 후 다시 시도해 주세요.';
	}
}

async function handleDelete(id: Id<'notices'>) {
	const key = String(id);
	// Drop it from the list now so the row outro starts on confirm, not after
	// the mutation round-trip (which just snapped the row away).
	dismissedIds.add(key);
	confirmingDeleteId = null;
	try {
		await client.mutation(api.notices.remove, { sessionToken, id });
		panelError = null;
		if (editorTarget === key) resetForm();
	} catch {
		dismissedIds.delete(key);
		panelError = '삭제하지 못했습니다. 잠시 후 다시 시도해 주세요.';
	}
}

function hideDismissed(groups: DayGroup[] | undefined) {
	return (groups ?? [])
		.map((g) => ({
			...g,
			notices: g.notices.filter((n) => !dismissedIds.has(String(n._id)))
		}))
		.filter((g) => g.notices.length > 0);
}

// Grouped notices from overview
const allGroupedNotices = $derived(overview.data?.currentGroups || []);
const visibleGroups = $derived(hideDismissed(allGroupedNotices));

// First paint is silent so a page of date groups doesn't all slide in.
let live = $state(false);
onMount(() => {
	live = true;
});
const listSlide = $derived(live ? slideY : slideNone);

// Most recent notice timestamp, or null when there are none (avoids Math.max()
// returning -Infinity → "Invalid Date").
const lastUpdatedTs = $derived.by(() => {
	const ts = allGroupedNotices
		.flatMap((g) => g.notices)
		.map((n) => n.updatedAt ?? n.createdAt)
		.filter((t): t is number => typeof t === 'number');
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
</svelte:head>

{#snippet noticeEditor()}
	<div transition:slide={slideY}>
		<div
			class="bg-card border border-border rounded-3xl p-4 mb-6"
			in:fade={fadeIn}
			out:fade={fadeOut}
		>
			<h2 class="text-lg font-semibold mb-4 text-foreground">
				{isEditing ? '공지 수정' : '새 공지 추가'}
			</h2>

			<form class="grid gap-4" onsubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
				<div>
					<label for="notice-title" class="block text-sm font-semibold mb-1.5 text-muted-foreground">제목 *</label>
					<input
						id="notice-title"
						type="text"
						bind:value={noticeForm.title}
						onkeydown={(e) => { if (e.key === 'Enter' && e.isComposing) e.preventDefault(); }}
						class="w-full h-11 px-3.5 rounded-lg bg-muted text-base text-foreground placeholder:text-muted-foreground break-words"
						placeholder="예: 수학 과제 제출"
					/>
				</div>

				<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
					<div>
						<label for="notice-subject" class="block text-sm font-semibold mb-1.5 text-muted-foreground">과목 *</label>
						<input
							id="notice-subject"
							type="text"
							bind:value={noticeForm.subject}
							onkeydown={(e) => { if (e.key === 'Enter' && e.isComposing) e.preventDefault(); }}
							class="w-full h-11 px-3.5 rounded-lg bg-muted text-base text-foreground placeholder:text-muted-foreground break-words"
							placeholder="예: 수학"
						/>
					</div>

					<div>
						<label for="notice-type" class="block text-sm font-semibold mb-1.5 text-muted-foreground">종류 *</label>
						<div class="relative">
							<select
								id="notice-type"
								bind:value={noticeForm.type}
								class="w-full h-11 pl-3.5 pr-10 rounded-lg bg-muted text-base text-foreground appearance-none"
							>
								{#each noticeTypes as type}
									<option value={type}>{type}</option>
								{/each}
							</select>
							<svg
								viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2"
								class="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
								aria-hidden="true"
							>
								<path stroke-linecap="round" stroke-linejoin="round" d="M5 7.5l5 5 5-5"/>
							</svg>
						</div>
					</div>
				</div>

				<div>
					<label for="notice-date" class="block text-sm font-semibold mb-1.5 text-muted-foreground">마감일 *</label>
					<input
						id="notice-date"
						type="date"
						bind:value={noticeForm.dueDate}
						class="w-full h-11 px-3.5 rounded-lg bg-muted text-base text-foreground placeholder:text-muted-foreground"
					/>
				</div>

				<div>
					<label for="notice-description" class="block text-sm font-semibold mb-1.5 text-muted-foreground">설명 (마크다운 지원)</label>
					<textarea
						id="notice-description"
						bind:value={noticeForm.description}
						use:autosize={noticeForm.description}
						rows="8"
						class="w-full px-3.5 py-2.5 rounded-lg bg-muted text-base text-foreground font-mono placeholder:text-muted-foreground resize-none break-words overflow-hidden"
						placeholder="상세 설명 또는 준비물 목록&#10;&#10;마크다운 사용 가능:&#10;**굵게** *기울임* `코드`&#10;# 제목 ## 부제목&#10;- 목록 항목&#10;> 인용구&#10;![이미지](URL)&#10;유튜브 링크는 자동 변환됩니다"
					></textarea>
					<p class="text-xs text-muted-foreground mt-1.5">마크다운 문법을 사용할 수 있습니다. 상세 페이지에서 형식화되어 표시됩니다.</p>
				</div>

				<div>
					<div class="text-sm font-semibold mb-1.5 text-muted-foreground">파일 첨부</div>
					<FileUpload
						files={noticeForm.files}
						onFilesChange={handleFilesChange}
						{sessionToken}
					/>
				</div>

				{#if formError}
					<p class="text-sm font-semibold text-destructive" role="alert">{formError}</p>
				{/if}

				<div class="flex gap-2">
					<PillButton type="submit" morph text={isEditing ? '수정' : '추가'} class="px-5 py-2.5" />
					<PillButton type="button" text="취소" variant="secondary" onclick={resetForm} class="px-5 py-2.5" />
				</div>
			</form>
		</div>
	</div>
{/snippet}

{#if !data.isAuthenticated}
	<!-- PIN Authentication Form -->
	<div class="flex items-center justify-center min-h-[calc(100vh-8rem)] px-4">
		<div class="bg-card p-8 border border-border rounded-3xl max-w-sm w-full">
			<h1 class="text-2xl font-bold tracking-tight text-foreground mb-6 text-center">관리자 로그인</h1>

			<form method="POST" action="?/login" use:enhance>
				<div class="mb-4">
					<label for="pin" class="block text-sm font-semibold mb-2 text-muted-foreground">PIN</label>
					<input
						id="pin"
						name="pin"
						type="password"
						inputmode="numeric"
						autocomplete="current-password"
						bind:value={pin}
						class="w-full h-12 px-3.5 rounded-lg bg-muted text-base text-foreground placeholder:text-muted-foreground"
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
			<h1 class="text-xl font-bold text-foreground">공지 관리</h1>
			<div class="flex items-center gap-2">
				<PillButton
					morph
					text={editorTarget === 'new' ? '취소' : '새 공지 추가'}
					onclick={startNewNotice}
					emphasized={!overview.isLoading && allGroupedNotices.length === 0}
				/>

				<form method="POST" action="?/logout" use:enhance class="inline">
					<PillButton type="submit" text="로그아웃" variant="secondary" />
				</form>
			</div>
		</div>

		{#if panelError}
			<p class="mb-4 rounded-xl border border-destructive/30 bg-destructive/10 px-3.5 py-2.5 text-sm font-semibold text-destructive" role="alert">
				{panelError}
			</p>
		{/if}

		{#if editorTarget === 'new'}
			{@render noticeEditor()}
		{/if}

		<!-- Notice List -->
		{#if overview.isLoading}
			<LoadingState />
        {:else if overview.error}
			<div class="text-center py-8 text-destructive">
				<p>공지를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.</p>
				<PillButton text="다시 시도" onclick={() => window.location.reload()} class="mt-3" />
			</div>
        {:else}
			<!-- Current and Future Notices. Else on the each so the last date
			     group can outro instead of a length check tearing it down. -->
            {#each visibleGroups as group (group.date)}
				<div
					class="mb-6"
					animate:flip={flipMove}
					in:slide={listSlide}
					out:slide={slideYOut}
				>
					<h2 class="text-base font-semibold mb-3 text-foreground border-l-[3px] border-foreground pl-3">
						{group.displayDate}
					</h2>

                    <div class="grid gap-2">
                        {#each group.notices as notice (notice._id)}
                            <div animate:flip={flipMove} in:slide={listSlide} out:slide={slideYOut}>
                            {#if editorTarget === String(notice._id)}
                                {@render noticeEditor()}
                            {:else}
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
                                        <p class="text-muted-foreground text-xs sm:text-sm line-clamp-2 overflow-hidden text-ellipsis break-all">
                                            {notice.summary}
                                        </p>
										{/if}
                                    </div>
                                    <ConfirmDeleteActions
                                        confirming={confirmingDeleteId === String(notice._id)}
                                        onEdit={() => editNotice(notice._id)}
                                        onAskDelete={() => (confirmingDeleteId = String(notice._id))}
                                        onConfirmDelete={() => handleDelete(notice._id)}
                                        onCancel={() => (confirmingDeleteId = null)}
                                    />
                                </div>
                            </div>
                            {/if}
                            </div>
                        {/each}
                    </div>
				</div>
            {:else}
                <div class="text-center py-16 text-sm text-muted-foreground">등록된 공지가 없습니다</div>
            {/each}

			<!-- Past Notices by Month (lazy) -->
			{#if overview.data?.pastMonths && overview.data.pastMonths.length > 0}
                <div class="mt-6 pt-6 border-t border-border" in:slide={listSlide} out:slide={slideYOut}>
                    <h2 class="text-base sm:text-lg font-semibold mb-3 text-muted-foreground">지난 공지</h2>
                    {#each overview.data.pastMonths as m (m.monthKey)}
                        <div
                            class="mb-1.5 sm:mb-2"
                            animate:flip={flipMove}
                            in:slide={listSlide}
                            out:slide={slideYOut}
                        >
                        <details
                            class="bg-card border border-border rounded-3xl overflow-hidden"
                            open={openMonthKey === m.monthKey}
                        >
                            <summary
                                class="touch-target flex items-center gap-2 px-3 sm:px-4 py-2.5 sm:py-3 cursor-pointer list-none transition-colors duration-150 pointer:hover:bg-muted text-muted-foreground font-semibold text-sm sm:text-base [&::-webkit-details-marker]:hidden"
                                onclick={(e) => {
                                    e.preventDefault();
                                    openMonthKey = openMonthKey === m.monthKey ? null : m.monthKey;
                                }}
                            >
                                <DisclosureCaret open={openMonthKey === m.monthKey} />
                                {m.monthName} ({m.total}개)
                            </summary>
                            {#if openMonthKey === m.monthKey}
                                <AdminPastMonthDetails
                                    monthKey={m.monthKey}
                                    cutoff={data.cutoff}
                                    today={data.today}
                                    {dismissedIds}
                                    {editorTarget}
                                    editor={noticeEditor}
                                    onEdit={editNotice}
                                    onDelete={handleDelete}
                                />
                            {/if}
                        </details>
                        </div>
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
