<script lang="ts">
import { useConvexClient, useQuery } from 'convex-svelte';
import { api } from "@class-info/backend/convex/_generated/api";
import LoadingState from '$lib/components/ui/LoadingState.svelte';
import ErrorState from '$lib/components/ui/ErrorState.svelte';
import EmptyState from '$lib/components/ui/EmptyState.svelte';
import Drawer from '$lib/components/ui/Drawer.svelte';
import HScroll from '$lib/components/ui/HScroll.svelte';
import PillButton from '$lib/components/ui/PillButton.svelte';
import SegmentedControl from '$lib/components/ui/SegmentedControl.svelte';
import { createBlurPulse } from '$lib/blurPulse.svelte';
import { focusOnElement } from '$lib/actions/focus';
import { formatAbsolute, formatRelative } from '$lib/date';
import { onMount } from 'svelte';
import type { PageData } from './$types.js';

const { data }: { data: PageData } = $props();
const client = useConvexClient();

// 0: this week, 1: next week, 'full': the standing timetable.
type Tab = 0 | 1 | 'full';
let selectedTab = $state<Tab>(0);
const isFull = $derived(selectedTab === 'full');
const selectedWeek = $derived<0 | 1>(selectedTab === 1 ? 1 : 0);

const isAuthenticated = data.isAuthenticated as boolean;
const sessionToken = $derived((data.sessionToken as string | null) ?? '');
// Editing is only ever of the standing timetable — the fetched weeks are
// overwritten by the cron a few times a day.
const canEdit = $derived(isAuthenticated && isFull);

// Relative time is resolved after mount so SSR and hydration agree on the markup.
let now = $state<number | null>(null);

onMount(() => {
	now = Date.now();
});

const blur = createBlurPulse();
$effect(() => { selectedTab; blur.pulse(); });

const timetableQuery = useQuery(
	api.timetable.getByWeek,
	() => ({ week: selectedWeek }),
	() => ({ keepPreviousData: true })
);

const fullQuery = useQuery(api.timetable.getFull, () => ({}), () => ({ keepPreviousData: true }));

// convex-svelte tests `initialData` for truthiness, so it cannot carry the
// `null` that means "nothing stored yet" — a page whose server load already
// answered `null` would sit on a spinner until the socket connected. Hold the
// server's answer here instead and let the live result replace it.
const serverWeek = $derived(selectedWeek === 1 ? data.nextWeek : data.timetable);
const weekData = $derived(timetableQuery.data !== undefined ? timetableQuery.data : serverWeek);
const fullData = $derived(fullQuery.data !== undefined ? fullQuery.data : data.full);

// Undefined means neither source has answered yet; null is an answer.
const pending = $derived(isFull ? fullData === undefined : weekData === undefined);
const queryError = $derived(
	pending ? (isFull ? fullQuery.error : timetableQuery.error) : undefined
);

const dayNames = ['월', '화', '수', '목', '금'];

// One shape for both views. The standing timetable has no substitutions to
// report, so its cells are never `replaced` — that is what makes it the
// baseline the weekly view's amber is measured against.
type Cell = { subject: string; teacher: string; replaced: boolean };

const days = $derived<Cell[][]>(
	isFull
		? (fullData?.timetable ?? []).map((day) =>
				day.map((slot) => ({ subject: slot.subject, teacher: slot.teacher, replaced: false }))
			)
		: (weekData?.timetable ?? []).map((day) =>
				day.map((slot) => ({
					subject: slot.subject,
					teacher: slot.teacher,
					replaced: slot.replaced
				}))
			)
);

const dayTimes = $derived(isFull ? (fullData?.day_time ?? []) : (weekData?.day_time ?? []));

const maxPeriods = $derived(days.reduce((max, day) => Math.max(max, day.length), 0));
// An all-blank standing timetable is nothing to show, however many rows it has.
const hasData = $derived(isFull ? maxPeriods > 0 : !!weekData);

const editedAt = $derived(
	isFull ? (fullData?.updatedAt ?? null) : (weekData?.editedAt ?? null)
);

// Korean counts by code point here, not UTF-16 unit.
function subjectSizeClass(subject: string): string {
	const n = [...subject].length;
	if (n <= 3) return 'text-list sm:text-xl';
	if (n === 4) return 'text-sm sm:text-xl';
	return 'text-xs sm:text-xl';
}

// "1교시(08:40~09:30)" → "08:40". The end time is the next period's start,
// so it earns nothing in the app's narrowest column.
function getPeriodLabel(period: number): string {
	const label = dayTimes[period - 1];
	if (!label) return '';
	const inParens = label.match(/\(([^)]+)\)/)?.[1] ?? label;
	return inParens.split(/[~-]/)[0].trim();
}

// Padding lives on the inner box, not the cell, so the editing button can fill
// the cell and still measure the same as the static view.
const CELL_PAD = 'py-3 sm:py-6 px-1';

// ── Admin: snapshot a fetched week into the standing timetable ───────────────

const MAX_PERIODS = 12;

let adminError = $state<string | null>(null);
let isSnapshotting = $state(false);

async function handleSnapshot(week: 0 | 1) {
	if (isSnapshotting) return;
	const hasStanding = (fullData?.timetable ?? []).some((day) => day.length > 0);
	const label = week === 1 ? '다음 주' : '이번 주';
	// Overwriting hand-made corrections is the one destructive thing here, so
	// it asks — and only when there is something to lose.
	if (hasStanding && !confirm(`전체 시간표를 ${label} 시간표로 덮어쓸까요?`)) return;
	isSnapshotting = true;
	adminError = null;
	try {
		await client.mutation(api.timetable.snapshotFull, { sessionToken, week });
		selectedTab = 'full';
	} catch {
		adminError = '전체 시간표를 저장하지 못했어요. 잠시 후 다시 시도해 주세요.';
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
	} catch {
		adminError = '교시 수를 바꾸지 못했어요. 잠시 후 다시 시도해 주세요.';
	}
}

// ── Admin: edit one cell ─────────────────────────────────────────────────────

type SlotDraft = { day: number; period: number; subject: string; teacher: string };
let editingSlot = $state<SlotDraft | null>(null);
let isSavingSlot = $state(false);
let slotError = $state<string | null>(null);

function openSlotEditor(day: number, period: number) {
	if (!canEdit) return;
	const current = days[day]?.[period - 1];
	editingSlot = {
		day,
		period,
		subject: current?.subject ?? '',
		teacher: current?.teacher ?? ''
	};
	slotError = null;
}

async function writeSlot(subject: string, teacher: string) {
	if (!editingSlot || isSavingSlot) return;
	isSavingSlot = true;
	slotError = null;
	try {
		await client.mutation(api.timetable.setFullSlot, {
			sessionToken,
			day: editingSlot.day,
			period: editingSlot.period,
			subject,
			teacher
		});
		if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
		editingSlot = null;
	} catch {
		slotError = '저장하지 못했어요. 잠시 후 다시 시도해 주세요.';
	} finally {
		isSavingSlot = false;
	}
}
</script>


<svelte:head>
	<title>시간표 - 1학년 3반</title>
	<meta name="description" content="정확한 시간표를 변경사항까지 한 번에 확인하세요. " />

	<!-- Open Graph -->
	<meta property="og:title" content="시간표 - 1학년 3반" />
	<meta property="og:description" content="정확한 시간표를 변경사항까지 한 번에 확인하세요. " />
	<meta property="og:url" content="https://timefor.school/timetable" />
	<meta property="og:type" content="website" />
	<meta property="og:site_name" content="TimeforSchool" />

	<!-- Twitter Card -->
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content="시간표 - 1학년 3반" />
	<meta name="twitter:description" content="정확한 시간표를 변경사항까지 한 번에 확인하세요. " />
	<meta name="robots" content="noindex" />
</svelte:head>

{#snippet cell(slot: Cell | undefined)}
	{#if slot && slot.subject}
		<div
			class="truncate {subjectSizeClass(slot.subject)} font-semibold {slot.replaced ? 'text-amber-700 dark:text-amber-300' : 'text-foreground'}"
			title={slot.subject}
		>{slot.subject}</div>
		<div class="truncate text-sm sm:text-base mt-0.5 text-muted-foreground">{slot.teacher}</div>
	{:else}
		<span class="text-muted-foreground/50 text-base sm:text-lg" aria-hidden="true">-</span>
		<span class="sr-only">수업 없음</span>
	{/if}
{/snippet}

<div class="max-w-4xl mx-auto px-4 pt-4 pb-1 sm:pt-5 sm:pb-0 sm:px-4 print-sheet">
	<h1 class="sr-only print:hidden">시간표</h1>

	<!-- Printed heading. Screen readers already have the h1 above, and on paper
	     this is the only thing identifying the sheet. -->
	<h1 class="hidden print:block mb-5 text-center text-2xl font-bold tracking-tight text-foreground">
		1학년 3반 시간표
	</h1>

	<!-- Header: week / standing selector -->
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
	{:else if !hasData}
		<EmptyState message={isFull ? '전체 시간표가 아직 없어요' : '시간표가 없어요'} />
	{:else}
		<HScroll blurred={blur.blurred}>
				<table class="w-full min-w-[18rem] table-fixed border border-border border-collapse overflow-hidden rounded-xl mx-auto">
				<thead>
					<tr class="bg-muted">
						<th scope="col" class="px-1 py-3 border border-border"><span class="sr-only">교시</span></th>
						{#each dayNames as name}
							<th scope="col" class="px-1 py-2 text-center text-base font-semibold sm:text-lg text-foreground border border-border">{name}</th>
						{/each}
					</tr>
				</thead>
				<tbody>
					{#each Array(maxPeriods) as _, i}
						<tr>
							<th scope="row" class="px-0.5 py-3 sm:py-6 border border-border text-center font-normal bg-muted">
								<div class="text-sm sm:text-lg font-semibold text-foreground whitespace-nowrap">{i + 1}교시</div>
								<div class="text-[11px] sm:text-base text-muted-foreground tabular-nums leading-tight">{getPeriodLabel(i + 1)}</div>
							</th>
							{#each dayNames as dayName, d}
								{@const slot = days[d]?.[i]}
								<td
									data-replaced={slot?.replaced ? '' : undefined}
									class="border border-border p-0 text-center {slot?.replaced ? 'bg-amber-100/70 dark:bg-amber-900/20' : 'bg-card'}"
								>
									<!-- The whole cell is the hit area while editing, so what
									     is pressed is exactly what opens. -->
									{#if canEdit}
										<button
											type="button"
											onclick={() => openSlotEditor(d, i + 1)}
											aria-label="{dayName}요일 {i + 1}교시 수정"
											class="block w-full {CELL_PAD} cursor-pointer transition-colors duration-150 pointer:hover:bg-muted"
										>{@render cell(slot)}</button>
									{:else}
										<div class="{CELL_PAD}">{@render cell(slot)}</div>
									{/if}
								</td>
							{/each}
						</tr>
					{/each}

					<!-- Per-day length. A day is as long as it is: Friday routinely
					     ends before Monday does. -->
					{#if canEdit}
						<tr class="print:hidden">
							<th scope="row" class="px-0.5 py-2 border border-border text-center bg-muted">
								<span class="text-xs font-semibold text-muted-foreground">교시 수</span>
							</th>
							{#each dayNames as dayName, d}
								{@const length = days[d]?.length ?? 0}
								<td class="border border-border bg-card px-1 py-2">
									<div class="flex items-center justify-center gap-1">
										<button
											type="button"
											onclick={() => changeDayLength(d, -1)}
											disabled={length <= 0}
											aria-label="{dayName}요일 교시 줄이기"
											class="pressable touch-target w-6 h-6 flex items-center justify-center rounded-full border border-border text-muted-foreground transition-colors duration-150 enabled:pointer:hover:text-foreground enabled:pointer:hover:bg-muted disabled:opacity-40"
										>−</button>
										<span class="w-5 text-center text-sm font-semibold tabular-nums text-foreground">{length}</span>
										<button
											type="button"
											onclick={() => changeDayLength(d, 1)}
											disabled={length >= MAX_PERIODS}
											aria-label="{dayName}요일 교시 늘리기"
											class="pressable touch-target w-6 h-6 flex items-center justify-center rounded-full border border-border text-muted-foreground transition-colors duration-150 enabled:pointer:hover:text-foreground enabled:pointer:hover:bg-muted disabled:opacity-40"
										>+</button>
									</div>
								</td>
							{/each}
						</tr>
					{/if}
				</tbody>
			</table>
		</HScroll>

		{#if adminError}
			<p class="mt-3 text-sm font-semibold text-destructive print:hidden" role="alert">{adminError}</p>
		{/if}

		<div class="mt-3 flex items-center justify-between gap-3 pb-10 print:hidden">
			<p class="text-xs text-muted-foreground">
				{#if editedAt !== null}
					업데이트: <span title={formatAbsolute(editedAt)}>{now === null ? formatAbsolute(editedAt) : formatRelative(editedAt, now)}</span>
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
				>인쇄</button>
			</div>
		</div>
	{/if}

	<!-- An empty standing timetable still needs the snapshot control: the empty
	     state above stands where the table (and its footer) would have been. -->
	{#if isAuthenticated && isFull && !hasData && !pending && !queryError}
		<div class="-mt-8 flex flex-wrap justify-center gap-2 pb-10 print:hidden">
			<PillButton
				variant="secondary"
				text="이번 주에서 가져오기"
				disabled={isSnapshotting}
				onclick={() => handleSnapshot(0)}
			/>
			<PillButton
				variant="secondary"
				text="다음 주에서 가져오기"
				disabled={isSnapshotting}
				onclick={() => handleSnapshot(1)}
			/>
		</div>
		{#if adminError}
			<p class="mb-8 text-center text-sm font-semibold text-destructive" role="alert">{adminError}</p>
		{/if}
	{/if}
</div>

<!-- Cell editor -->
<Drawer open={editingSlot !== null} onclose={() => (editingSlot = null)}>
	{#snippet header()}
		{#if editingSlot}
			<p class="text-sm font-semibold text-muted-foreground mb-1">전체 시간표</p>
			<div class="flex items-baseline gap-2">
				<h2 class="text-2xl font-bold leading-tight text-foreground">
					{dayNames[editingSlot.day]}요일
				</h2>
				<span class="text-base text-muted-foreground leading-tight tabular-nums">{editingSlot.period}교시</span>
			</div>
		{/if}
	{/snippet}

	{#if editingSlot}
		<form
			class="space-y-3.5"
			onsubmit={(e) => {
				e.preventDefault();
				if (editingSlot) writeSlot(editingSlot.subject, editingSlot.teacher);
			}}
		>
			<div>
				<label for="slot-subject" class="block text-sm font-semibold mb-1.5 text-muted-foreground">과목</label>
				<input
					id="slot-subject"
					type="text"
					bind:value={editingSlot.subject}
					use:focusOnElement={320}
					placeholder="예: 수학"
					class="w-full h-11 px-3.5 rounded-lg bg-muted text-base text-foreground placeholder:text-muted-foreground"
					onkeydown={(e) => { if (e.key === 'Enter' && e.isComposing) e.preventDefault(); }}
				/>
			</div>
			<div>
				<label for="slot-teacher" class="block text-sm font-semibold mb-1.5 text-muted-foreground">선생님</label>
				<input
					id="slot-teacher"
					type="text"
					bind:value={editingSlot.teacher}
					placeholder="예: 김철수"
					class="w-full h-11 px-3.5 rounded-lg bg-muted text-base text-foreground placeholder:text-muted-foreground"
					onkeydown={(e) => { if (e.key === 'Enter' && e.isComposing) e.preventDefault(); }}
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
				<PillButton
					text="비우기"
					variant="secondary"
					disabled={isSavingSlot}
					onclick={() => writeSlot('', '')}
				/>
			</div>
		</form>
	{/if}
</Drawer>
