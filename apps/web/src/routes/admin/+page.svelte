<script lang="ts">
import { useConvexClient, useQuery } from 'convex-svelte';
import { tick } from 'svelte';
import { SvelteSet } from 'svelte/reactivity';
import { slide } from 'svelte/transition';
import { enhance } from '$app/forms';
import { api } from '@class-info/backend/convex/_generated/api';
import type { Id } from '@class-info/backend/convex/_generated/dataModel';
import { CLASS_LABEL } from '@class-info/backend/convex/config';
import PageMeta from '$lib/components/PageMeta.svelte';
import LoadingState from '$lib/components/ui/LoadingState.svelte';
import PillButton from '$lib/components/ui/PillButton.svelte';
import Disclosure from '$lib/components/ui/Disclosure.svelte';
import RelativeTime from '$lib/components/ui/RelativeTime.svelte';
import { adminErrorMessage } from '$lib/errors';
import { followCollapsing } from '$lib/scroll';
import { slideNone, slideY, slideYOut } from '$lib/transitions';
import AdminNoticeRow from './AdminNoticeRow.svelte';
import AdminPastMonthDetails from './AdminPastMonthDetails.svelte';
import NoticeEditor, { emptyNoticeForm, type NoticeForm } from './NoticeEditor.svelte';
import type { ActionData, PageData } from './$types';

const { data, form }: { data: PageData; form: ActionData } = $props();
const client = useConvexClient();

const sessionToken = $derived(data.sessionToken ?? '');

const overview = useQuery(
	api.notices.overview,
	() => ({ cutoff: data.cutoff, today: data.today }),
	() => ({ initialData: data.overview, keepPreviousData: true })
);
let openMonthKey = $state<string | null>(null);

// null = closed, 'new' = adding, otherwise the id of the notice being edited.
let editorTarget = $state<string | null>(null);
const isEditing = $derived(editorTarget !== null && editorTarget !== 'new');
let noticeForm = $state<NoticeForm>(emptyNoticeForm());
let formError = $state<string | null>(null);
let panelError = $state<string | null>(null);
let isSubmitting = $state(false);

// Deletes are confirmed in the row; one id at a time across current and past lists.
let confirmingDeleteId = $state<string | null>(null);
// Rows hidden on confirm, so the outro starts before the mutation returns.
const dismissedIds = new SvelteSet<string>();

// Attachments are only detached while editing. Files dropped from a saved
// notice are deleted once the save lands; uploads that never get saved are
// deleted when the editor is abandoned.
let savedFiles: Id<'files'>[] = [];
let freshUploads: Id<'files'>[] = [];

function deleteFiles(ids: Id<'files'>[]) {
	for (const fileId of ids) {
		client.mutation(api.files.deleteFile, { sessionToken, fileId }).catch(() => {});
	}
}

function discardUploads() {
	deleteFiles(freshUploads);
	freshUploads = [];
}

function openEditor(target: string, next: NoticeForm) {
	discardUploads();
	noticeForm = next;
	savedFiles = [...next.files];
	editorTarget = target;
	formError = null;
	confirmingDeleteId = null;
}

function closeEditor() {
	followCollapsing(document.getElementById('notice-editor'));
	noticeForm = emptyNoticeForm();
	savedFiles = [];
	freshUploads = [];
	editorTarget = null;
	formError = null;
}

function cancelEditor() {
	discardUploads();
	closeEditor();
}

async function toggleNewNotice() {
	if (editorTarget === 'new') return cancelEditor();
	openEditor('new', emptyNoticeForm());
	await tick();
	document.getElementById('notice-editor')?.scrollIntoView({ block: 'nearest' });
}

// Loads the full record: the list only has the summary projection, and saving
// from that would wipe the description and files.
async function editNotice(id: Id<'notices'>) {
	try {
		const { notice } = await client.query(api.notices.detail, { id });
		if (!notice) throw new Error('missing');
		panelError = null;
		openEditor(id, {
			title: notice.title,
			subject: notice.subject,
			type: notice.type,
			description: notice.description,
			dueDate: notice.dueDate,
			files: notice.files ?? []
		});
	} catch {
		panelError = '공지를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.';
	}
}

async function handleSubmit() {
	if (isSubmitting) return;
	const payload = { ...noticeForm, title: noticeForm.title.trim(), subject: noticeForm.subject.trim() };
	if (!payload.title || !payload.subject || !payload.dueDate) {
		formError = '제목, 과목, 마감일을 모두 입력해 주세요.';
		return;
	}
	formError = null;
	isSubmitting = true;
	try {
		if (isEditing) {
			await client.mutation(api.notices.update, { sessionToken, id: editorTarget as Id<'notices'>, ...payload });
		} else {
			await client.mutation(api.notices.create, { sessionToken, ...payload });
		}
		deleteFiles([...savedFiles, ...freshUploads].filter((id) => !payload.files.includes(id)));
		closeEditor();
	} catch (err) {
		formError = adminErrorMessage(err, '저장하지 못했습니다. 잠시 후 다시 시도해 주세요.');
	} finally {
		isSubmitting = false;
	}
}

async function handleDelete(id: Id<'notices'>) {
	const key = String(id);
	dismissedIds.add(key);
	confirmingDeleteId = null;
	try {
		await client.mutation(api.notices.remove, { sessionToken, id });
		panelError = null;
		if (editorTarget === key) cancelEditor();
	} catch (err) {
		dismissedIds.delete(key);
		panelError = adminErrorMessage(err, '삭제하지 못했습니다. 잠시 후 다시 시도해 주세요.');
	}
}

const allGroups = $derived(overview.data?.currentGroups ?? []);
const visibleGroups = $derived(
	allGroups
		.map((g) => ({ ...g, notices: g.notices.filter((n) => !dismissedIds.has(String(n._id))) }))
		.filter((g) => g.notices.length > 0)
);
const pastMonths = $derived(overview.data?.pastMonths ?? []);

// The first paint of the list is silent, so the page doesn't slide in as one block.
let live = $state(false);
$effect(() => {
	if (overview.isLoading) {
		live = false;
		return;
	}
	const frame = requestAnimationFrame(() => (live = true));
	return () => cancelAnimationFrame(frame);
});
const listSlide = $derived(live ? slideY : slideNone);

const lastUpdatedTs = $derived.by(() => {
	const ts = allGroups
		.flatMap((g) => g.notices)
		.map((n) => n.updatedAt ?? n.createdAt)
		.filter((t): t is number => typeof t === 'number');
	return ts.length > 0 ? Math.max(...ts) : null;
});
</script>

<PageMeta
	title="관리자 페이지 - {CLASS_LABEL} 공지"
	description="{CLASS_LABEL} 공지 관리자 페이지입니다."
	robots="noindex, nofollow"
/>

{#snippet noticeEditor()}
	<NoticeEditor
		bind:form={noticeForm}
		{isEditing}
		{isSubmitting}
		error={formError}
		{sessionToken}
		onsubmit={handleSubmit}
		oncancel={cancelEditor}
		onUploaded={(ids) => (freshUploads = [...freshUploads, ...ids])}
	/>
{/snippet}

{#if !data.isAuthenticated}
	<div class="flex items-center justify-center min-h-[calc(100svh-8rem)] px-4">
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
						class="field h-12"
						placeholder="관리자 PIN을 입력하세요"
						required
					/>
				</div>

				{#if form?.error}
					<p class="mb-4 text-destructive text-sm" role="alert">{form.error}</p>
				{/if}

				<button
					type="submit"
					class="pressable-lg w-full h-12 rounded-xl bg-primary font-semibold text-primary-foreground text-sm transition-opacity duration-150 pointer:hover:opacity-90"
				>
					로그인
				</button>
			</form>

			<div class="mt-6 text-center">
				<a href="/" class="text-sm text-muted-foreground pointer:hover:text-foreground transition-colors duration-150">← 홈으로 돌아가기</a>
			</div>
		</div>
	</div>
{:else}
	<div class="min-h-screen">
		<div class="max-w-4xl mx-auto px-4 pt-5 pb-4">
			<div class="flex items-center justify-between gap-3 mb-5">
				<h1 class="text-xl font-bold text-foreground">공지 관리</h1>
				<div class="flex items-center gap-2">
					<PillButton
						morph
						text={editorTarget === 'new' ? '취소' : '새 공지 추가'}
						onclick={toggleNewNotice}
						emphasized={!overview.isLoading && allGroups.length === 0}
					/>
					<form method="POST" action="?/logout" use:enhance class="inline">
						<PillButton type="submit" text="로그아웃" variant="secondary" />
					</form>
				</div>
			</div>

			{#if panelError}
				<p
					class="mb-4 rounded-xl border border-destructive/30 bg-destructive/10 px-3.5 py-2.5 text-sm font-semibold text-destructive"
					role="alert"
				>
					{panelError}
				</p>
			{/if}

			{#if editorTarget === 'new'}
				{@render noticeEditor()}
			{/if}

			{#if overview.isLoading}
				<LoadingState />
			{:else if overview.error}
				<div class="text-center py-8 text-destructive">
					<p>공지를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.</p>
					<PillButton text="다시 시도" onclick={() => window.location.reload()} class="mt-3" />
				</div>
			{:else}
				<!-- `{:else}` on the each, so the last group can play its outro. No FLIP:
				     it measures survivors before the leaving row collapses. -->
				{#each visibleGroups as group (group.date)}
					<section class="mb-6" in:slide={listSlide} out:slide={slideYOut}>
						<h2 class="text-base font-semibold mb-3 text-foreground border-l-[3px] border-foreground pl-3">
							{group.displayDate}
						</h2>
						<div class="grid gap-2">
							{#each group.notices as notice (notice._id)}
								<div in:slide={listSlide} out:slide={slideYOut}>
									{#if editorTarget === String(notice._id)}
										{@render noticeEditor()}
									{:else}
										<AdminNoticeRow
											{notice}
											confirming={confirmingDeleteId === String(notice._id)}
											onEdit={editNotice}
											onAskDelete={(id) => (confirmingDeleteId = String(id))}
											onDelete={handleDelete}
											onCancel={() => (confirmingDeleteId = null)}
										/>
									{/if}
								</div>
							{/each}
						</div>
					</section>
				{:else}
					<div class="text-center py-16 text-sm text-muted-foreground">등록된 공지가 없습니다</div>
				{/each}

				{#if pastMonths.length > 0}
					<div class="mt-6 pt-6 border-t border-border" in:slide={listSlide} out:slide={slideYOut}>
						<h2 class="text-base sm:text-lg font-semibold mb-3 text-muted-foreground">지난 공지</h2>
						{#each pastMonths as m (m.monthKey)}
							<div class="mb-1.5 sm:mb-2" in:slide={listSlide} out:slide={slideYOut}>
								<Disclosure
									open={openMonthKey === m.monthKey}
									label="{m.monthName} ({m.total}개)"
									onToggle={() => (openMonthKey = openMonthKey === m.monthKey ? null : m.monthKey)}
								>
									<AdminPastMonthDetails
										monthKey={m.monthKey}
										cutoff={data.cutoff}
										today={data.today}
										{dismissedIds}
										{editorTarget}
										bind:confirmingDeleteId
										editor={noticeEditor}
										onEdit={editNotice}
										onDelete={handleDelete}
									/>
								</Disclosure>
							</div>
						{/each}
					</div>
				{/if}
			{/if}

			<div class="text-center py-4 text-xs text-muted-foreground border-t border-border mt-8 tabular-nums">
				마지막 업데이트:
				{#if lastUpdatedTs !== null}<RelativeTime ts={lastUpdatedTs} />{:else}없음{/if}
			</div>
		</div>
	</div>
{/if}
