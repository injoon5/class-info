<script lang="ts">
import { useConvexClient, useQuery } from 'convex-svelte';
import { api } from '@class-info/backend/convex/_generated/api';
import { CLASS_LABEL } from '@class-info/backend/convex/config';
import PageMeta from '$lib/components/PageMeta.svelte';
import LoadingState from '$lib/components/ui/LoadingState.svelte';
import ErrorState from '$lib/components/ui/ErrorState.svelte';
import EmptyState from '$lib/components/ui/EmptyState.svelte';
import Drawer from '$lib/components/ui/Drawer.svelte';
import PillButton from '$lib/components/ui/PillButton.svelte';
import RelativeTime from '$lib/components/ui/RelativeTime.svelte';
import SegmentedControl from '$lib/components/ui/SegmentedControl.svelte';
import { createBlurPulse } from '$lib/blurPulse.svelte';
import { focusOnElement } from '$lib/actions/focus';
import { blurActiveElement, holdComposingEnter } from '$lib/dom';
import { addDaysYyyymmdd, ymdParts } from '$lib/date';
import { adminErrorMessage } from '$lib/errors';
import { timetableForWeek } from '$lib/timetable';
import type { PageData } from './$types.js';

const { data }: { data: PageData } = $props();
const client = useConvexClient();

// 0 = this week, 1 = next week, 'full' = the standing timetable.
type Tab = 0 | 1 | 'full';
let selectedTab = $state<Tab>(0);
const isFull = $derived(selectedTab === 'full');
const selectedWeek = $derived<0 | 1>(selectedTab === 1 ? 1 : 0);

const isAuthenticated = $derived(data.isAuthenticated);
const sessionToken = $derived(data.sessionToken ?? '');
// Only the standing timetable is editable; the fetched weeks are overwritten by the cron.
const canEdit = $derived(isAuthenticated && isFull);

const blur = createBlurPulse();
$effect(() => {
	selectedTab;
	blur.pulse();
});

// Both weeks, always: either stored row may hold the week a tab asks for.
const week0Query = useQuery(api.timetable.getByWeek, () => ({ week: 0 as const }));
const week1Query = useQuery(api.timetable.getByWeek, () => ({ week: 1 as const }));
const fullQuery = useQuery(api.timetable.getFull, () => ({}));

// convex-svelte ignores a falsy `initialData`, so the server's `null` is held here.
const week0 = $derived(week0Query.data !== undefined ? week0Query.data : data.timetable);
const week1 = $derived(week1Query.data !== undefined ? week1Query.data : data.nextWeek);
const fullData = $derived(fullQuery.data !== undefined ? fullQuery.data : data.full);

function mondayFor(offset: 0 | 1): string {
	return addDaysYyyymmdd(data.thisMonday, offset * 7);
}

const weekData = $derived(timetableForWeek([week0, week1], mondayFor(selectedWeek), selectedWeek));

const weekRangeLabel = $derived.by(() => {
	const mon = ymdParts(mondayFor(selectedWeek));
	const fri = ymdParts(addDaysYyyymmdd(mondayFor(selectedWeek), 4));
	return mon && fri ? `${mon.month}/${mon.day} – ${fri.month}/${fri.day}` : '';
});

const pending = $derived(isFull ? fullData === undefined : week0 === undefined || week1 === undefined);
const queryError = $derived(
	pending ? (isFull ? fullQuery.error : (week0Query.error ?? week1Query.error)) : undefined
);

const dayNames = ['월', '화', '수', '목', '금', '토'];
const WEEKDAYS = 5;
const MAX_PERIODS = 12;

type Cell = { period: number; subject: string; teacher: string; replaced: boolean };

// The standing timetable is positional (gaps are padded with blanks); a fetched
// week is addressed by 교시, since the merged feed can skip a period.
const days = $derived<Cell[][]>(
	isFull
		? (fullData?.timetable ?? []).map((day) =>
				day.map((slot, i) => ({ period: i + 1, ...slot, replaced: false }))
			)
		: (weekData?.timetable ?? []).map((day) =>
				day.map(({ period, subject, teacher, replaced }) => ({ period, subject, teacher, replaced }))
			)
);
const byPeriod = $derived(days.map((day) => new Map(day.map((c) => [c.period, c]))));

const dayTimes = $derived((isFull ? fullData?.day_time : weekData?.day_time) ?? []);

// Saturday shows only when the feed published it; 전체 is always Mon–Fri.
const columns = $derived.by(() => {
	if (isFull) return dayNames.slice(0, WEEKDAYS);
	const lastDay = days.reduce((last, day, i) => (day.length > 0 ? i + 1 : last), 0);
	return dayNames.slice(0, Math.min(Math.max(lastDay, WEEKDAYS), dayNames.length));
});

const maxPeriods = $derived(days.reduce((max, day) => day.reduce((m, c) => Math.max(m, c.period), max), 0));
const hasData = $derived(maxPeriods > 0);
// An admin on 전체 still gets the grid, whose length row builds a timetable by hand.
const showGrid = $derived(hasData || canEdit);

const editedAt = $derived(isFull ? (fullData?.updatedAt ?? null) : (weekData?.editedAt ?? null));

// By code point, so Korean counts per syllable.
function subjectSizeClass(subject: string): string {
	return [...subject].length <= 3 ? 'text-list sm:text-xl' : 'text-xs sm:text-xl';
}

// "1교시(08:40~09:30)" → "08:40"
function periodStart(period: number): string {
	const label = dayTimes[period - 1];
	if (!label) return '';
	const inParens = label.match(/\(([^)]+)\)/)?.[1] ?? label;
	return inParens.split(/[~-]/)[0]?.trim() ?? '';
}

// Padding sits on the inner box so the edit button can fill the cell.
const CELL_PAD = 'py-3 sm:py-6 px-1';

// ── Admin ────────────────────────────────────────────────────────────────────

let adminError = $state<string | null>(null);
let isSnapshotting = $state(false);

async function handleSnapshot(offset: 0 | 1) {
	if (isSnapshotting) return;
	const row = timetableForWeek([week0, week1], mondayFor(offset), offset);
	if (!row) {
		adminError = '가져올 시간표가 없어요.';
		return;
	}
	const hasStanding = (fullData?.timetable ?? []).some((day) => day.length > 0);
	const label = offset === 1 ? '다음 주' : '이번 주';
	if (hasStanding && !confirm(`전체 시간표를 ${label} 시간표로 덮어쓸까요?`)) return;
	isSnapshotting = true;
	adminError = null;
	try {
		await client.mutation(api.timetable.snapshotFull, { sessionToken, week: row.week === 1 ? 1 : 0 });
		selectedTab = 'full';
	} catch (err) {
		adminError = adminErrorMessage(err, '전체 시간표를 저장하지 못했어요. 잠시 후 다시 시도해 주세요.');
	} finally {
		isSnapshotting = false;
	}
}

async function changeDayLength(day: number, delta: number) {
	const length = (days[day]?.length ?? 0) + delta;
	if (length < 0 || length > MAX_PERIODS) return;
	adminError = null;
	try {
		await client.mutation(api.timetable.setFullDayLength, { sessionToken, day, length });
	} catch (err) {
		adminError = adminErrorMessage(err, '교시 수를 바꾸지 못했어요. 잠시 후 다시 시도해 주세요.');
	}
}

// The draft outlives `editorOpen` so the sheet keeps its content while closing.
let editorOpen = $state(false);
let draft = $state({ day: 0, period: 1, subject: '', teacher: '' });
let isSavingSlot = $state(false);
let slotError = $state<string | null>(null);

function openSlotEditor(day: number, period: number) {
	const current = days[day]?.[period - 1];
	draft = { day, period, subject: current?.subject ?? '', teacher: current?.teacher ?? '' };
	slotError = null;
	editorOpen = true;
}

async function writeSlot(subject: string, teacher: string) {
	if (isSavingSlot) return;
	isSavingSlot = true;
	slotError = null;
	try {
		await client.mutation(api.timetable.setFullSlot, {
			sessionToken,
			day: draft.day,
			period: draft.period,
			subject,
			teacher
		});
		blurActiveElement();
		editorOpen = false;
	} catch (err) {
		slotError = adminErrorMessage(err, '저장하지 못했어요. 잠시 후 다시 시도해 주세요.');
	} finally {
		isSavingSlot = false;
	}
}
</script>

<PageMeta
	title="시간표 - {CLASS_LABEL}"
	description="정확한 시간표를 변경사항까지 한 번에 확인하세요."
	path="/timetable"
	robots="noindex"
/>

{#snippet cell(slot: Cell | undefined)}
	{#if slot?.subject}
		<div
			class="truncate {subjectSizeClass(slot.subject)} font-semibold {slot.replaced
				? 'text-amber-700 dark:text-amber-300'
				: 'text-foreground'}"
			title={slot.subject}
		>
			{slot.subject}
		</div>
		{#if slot.teacher}
			<div class="truncate text-sm sm:text-base mt-0.5 text-muted-foreground">{slot.teacher}</div>
		{/if}
	{:else}
		<span class="text-muted-foreground/50 text-base sm:text-lg" aria-hidden="true">-</span>
		<span class="sr-only">수업 없음</span>
	{/if}
{/snippet}

{#snippet lengthButton(label: string, glyph: string, disabled: boolean, onclick: () => void)}
	<button
		type="button"
		{onclick}
		{disabled}
		aria-label={label}
		class="pressable touch-target w-6 h-6 flex items-center justify-center rounded-full border border-border text-muted-foreground transition-colors duration-150 enabled:pointer:hover:text-foreground enabled:pointer:hover:bg-muted disabled:opacity-40"
	>
		{glyph}
	</button>
{/snippet}

<div class="max-w-4xl mx-auto px-4 pt-4 pb-1 sm:pt-5 sm:pb-0 print-sheet">
	<h1 class="sr-only print:hidden">시간표</h1>
	<h1 class="hidden print:block mb-5 text-center text-2xl font-bold tracking-tight text-foreground">
		{CLASS_LABEL} 시간표
	</h1>

	<div class="mb-3 print:hidden">
		<SegmentedControl
			bind:value={selectedTab}
			options={[
				{ value: 0, label: '이번 주', event: 'Week Toggle', eventProps: 'week=this' },
				{ value: 1, label: '다음 주', event: 'Week Toggle', eventProps: 'week=next' },
				{ value: 'full', label: '전체', event: 'Week Toggle', eventProps: 'week=full' }
			]}
		/>
	</div>

	{#if queryError}
		<ErrorState error={queryError} />
	{:else if pending}
		<LoadingState />
	{:else if !showGrid}
		<EmptyState message={isFull ? '전체 시간표가 아직 없어요' : '시간표가 없어요'} />
	{:else}
		<!-- A real box per row with one-sided hairlines, so each line is painted once. -->
		<div
			class="timetable-grid overflow-hidden print:overflow-visible rounded-xl mx-auto"
			style="--cols: {columns.length + 1}; {blur.style}"
			role="table"
		>
			<div role="row" class="timetable-row">
				<div role="columnheader" class="px-1 py-3 bg-muted"><span class="sr-only">교시</span></div>
				{#each columns as name (name)}
					<div role="columnheader" class="px-1 py-2.5 text-center text-sm font-semibold sm:text-base text-muted-foreground bg-muted">
						{name}
					</div>
				{/each}
			</div>
			{#each { length: maxPeriods } as _, i (i)}
				{@const period = i + 1}
				<div role="row" class="timetable-row">
					<div role="rowheader" class="px-0.5 py-3 sm:py-6 text-center bg-muted">
						<div class="text-sm sm:text-lg font-semibold text-foreground whitespace-nowrap">{period}교시</div>
						{#if periodStart(period)}
							<div class="text-[11px] sm:text-base text-muted-foreground tabular-nums leading-tight">{periodStart(period)}</div>
						{/if}
					</div>
					{#each columns as dayName, d (dayName)}
						{@const slot = byPeriod[d]?.get(period)}
						<div
							role="cell"
							data-replaced={slot?.replaced ? '' : undefined}
							class="p-0 text-center flex flex-col {slot?.replaced ? 'bg-amber-100/70 dark:bg-amber-900/20' : 'bg-card'}"
						>
							{#if canEdit}
								<button
									type="button"
									onclick={() => openSlotEditor(d, period)}
									aria-label="{dayName}요일 {period}교시 수정"
									class="block w-full flex-1 {CELL_PAD} cursor-pointer transition-colors duration-150 pointer:hover:bg-muted"
								>
									{@render cell(slot)}
								</button>
							{:else}
								<div class="flex-1 {CELL_PAD}">{@render cell(slot)}</div>
							{/if}
						</div>
					{/each}
				</div>
			{/each}

			{#if canEdit}
				<div role="row" class="timetable-row edit-row">
					<div role="rowheader" class="px-0.5 py-2 text-center bg-muted">
						<span class="text-xs font-semibold text-muted-foreground">교시 수</span>
					</div>
					{#each columns as dayName, d (dayName)}
						{@const length = days[d]?.length ?? 0}
						<div role="cell" class="bg-card px-1 py-2">
							<div class="flex items-center justify-center gap-1">
								{@render lengthButton(`${dayName}요일 교시 줄이기`, '−', length <= 0, () => changeDayLength(d, -1))}
								<span class="w-5 text-center text-sm font-semibold tabular-nums text-foreground">{length}</span>
								{@render lengthButton(`${dayName}요일 교시 늘리기`, '+', length >= MAX_PERIODS, () => changeDayLength(d, 1))}
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>

		{#if adminError}
			<p class="mt-3 text-sm font-semibold text-destructive print:hidden" role="alert">{adminError}</p>
		{/if}

		<div class="mt-3 flex items-center justify-between gap-3 pb-10 print:hidden">
			<p class="text-xs text-muted-foreground">
				{#if !isFull && weekRangeLabel}
					<span class="tabular-nums">{weekRangeLabel}</span>
					{#if editedAt !== null}<span aria-hidden="true"> · </span>{/if}
				{/if}
				{#if editedAt !== null}
					업데이트: <RelativeTime ts={editedAt} />
				{/if}
			</p>
			<div class="flex items-center gap-3">
				{#if isAuthenticated && !isFull}
					<PillButton
						size="sm"
						variant="secondary"
						morph
						text={isSnapshotting ? '저장 중…' : '전체 시간표로 저장'}
						pending={isSnapshotting}
						disabled={isSnapshotting}
						onclick={() => handleSnapshot(selectedWeek)}
					/>
				{/if}
				<button
					type="button"
					onclick={() => window.print()}
					class="pressable touch-target text-xs font-semibold text-muted-foreground pointer:hover:text-foreground"
				>
					인쇄
				</button>
			</div>
		</div>

		{#if canEdit && !hasData}
			<div class="flex flex-wrap justify-center gap-2 pb-10 print:hidden">
				<PillButton variant="secondary" text="이번 주에서 가져오기" disabled={isSnapshotting} onclick={() => handleSnapshot(0)} />
				<PillButton variant="secondary" text="다음 주에서 가져오기" disabled={isSnapshotting} onclick={() => handleSnapshot(1)} />
			</div>
		{/if}
	{/if}
</div>

<Drawer open={editorOpen} onclose={() => (editorOpen = false)}>
	{#snippet header()}
		<p class="text-sm font-semibold text-muted-foreground mb-1">전체 시간표</p>
		<div class="flex items-baseline gap-2">
			<h2 class="text-2xl font-bold leading-tight text-foreground">{dayNames[draft.day]}요일</h2>
			<span class="text-base text-muted-foreground leading-tight tabular-nums">{draft.period}교시</span>
		</div>
	{/snippet}

	<form
		class="space-y-3.5"
		onsubmit={(e) => {
			e.preventDefault();
			writeSlot(draft.subject, draft.teacher);
		}}
	>
		<div>
			<label for="slot-subject" class="block text-sm font-semibold mb-1.5 text-muted-foreground">과목</label>
			<input
				id="slot-subject"
				type="text"
				bind:value={draft.subject}
				use:focusOnElement={320}
				placeholder="예: 수학"
				class="field"
				onkeydown={holdComposingEnter}
			/>
		</div>
		<div>
			<label for="slot-teacher" class="block text-sm font-semibold mb-1.5 text-muted-foreground">선생님</label>
			<input
				id="slot-teacher"
				type="text"
				bind:value={draft.teacher}
				placeholder="예: 김철수"
				class="field"
				onkeydown={holdComposingEnter}
			/>
		</div>

		{#if slotError}
			<p class="text-sm font-semibold text-destructive" role="alert">{slotError}</p>
		{/if}

		<div class="flex gap-2 pt-1">
			<PillButton
				type="submit"
				morph
				text={isSavingSlot ? '저장 중…' : '저장'}
				pending={isSavingSlot}
				disabled={isSavingSlot}
				class="flex-1"
			/>
			<PillButton text="비우기" variant="secondary" disabled={isSavingSlot} onclick={() => writeSlot('', '')} />
		</div>
	</form>
</Drawer>

<style>
	.timetable-grid {
		border: 1px solid var(--grid-line);
	}
	.timetable-row {
		display: grid;
		grid-template-columns: repeat(var(--cols), minmax(0, 1fr));
	}
	.timetable-row:not(:last-child) {
		border-bottom: 1px solid var(--grid-line);
	}
	.timetable-row > :not(:last-child) {
		border-right: 1px solid var(--grid-line);
	}

	@media print {
		.edit-row {
			display: none;
		}
		.timetable-row:nth-last-child(2):has(+ .edit-row) {
			border-bottom: none;
		}
	}
</style>
