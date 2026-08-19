<script lang="ts">
import { useQuery } from 'convex-svelte';
import { api } from "@class-info/backend/convex/_generated/api";
import LoadingState from '../../components/LoadingState.svelte';
import ErrorState from '../../components/ErrorState.svelte';
import EmptyState from '../../components/EmptyState.svelte';
import HScroll from '../../components/HScroll.svelte';
import SegmentedControl from '../../components/SegmentedControl.svelte';
import { createBlurPulse } from '$lib/blurPulse.svelte';
import { formatAbsolute, formatRelative } from '$lib/date';
import { onMount } from 'svelte';
import PillButton from '../../components/PillButton.svelte';
import type { PageData } from './$types.js';

const { data }: { data: PageData } = $props();

let selectedWeek = $state(0); // 0: this week, 1: next week

// Relative time is resolved after mount so SSR and hydration agree on the markup.
let now = $state<number | null>(null);

// The heading that goes on the printout. Kept because whoever prints the
// timetable prints it again next week, and retyping it every time is the kind
// of small tax that stops people using the feature.
const DEFAULT_PRINT_TITLE = '1학년 3반 시간표';
const PRINT_TITLE_KEY = 'timetable:printTitle';
let printTitle = $state(DEFAULT_PRINT_TITLE);
let printTitleReady = $state(false);

onMount(() => {
	now = Date.now();
	try {
		printTitle = localStorage.getItem(PRINT_TITLE_KEY) ?? DEFAULT_PRINT_TITLE;
	} catch {
		// Private mode or storage disabled — the default still prints.
	}
	printTitleReady = true;
});

$effect(() => {
	if (!printTitleReady) return;
	try {
		localStorage.setItem(PRINT_TITLE_KEY, printTitle);
	} catch {
		// Not being able to remember it is not a reason to fail.
	}
});

const blur = createBlurPulse();
$effect(() => { selectedWeek; blur.pulse(); });

const timetableQuery = useQuery(
	api.timetable.getByWeek,
	() => ({ week: selectedWeek === 1 ? (1 as const) : (0 as const) }),
	() => ({
		initialData: selectedWeek === 1 ? data.nextWeek : data.timetable,
		keepPreviousData: true
	})
);

const dayNames = ['월', '화', '수', '목', '금'];

function getMaxPeriods(): number {
	const tt = (timetableQuery.data?.timetable || []) as Array<Array<{ period: number }>>;
	return tt.reduce((max: number, day) => Math.max(max, day.length), 0);
}

// "1교시(08:40~09:30)" → "08:40". The end time is the next period's start,
// so it earns nothing in the app's narrowest column.
// Korean counts by code point here, not UTF-16 unit.
function subjectSizeClass(subject: string): string {
	const n = [...subject].length;
	if (n <= 3) return 'text-list sm:text-xl';
	if (n === 4) return 'text-sm sm:text-xl';
	return 'text-xs sm:text-xl';
}

function getPeriodLabel(period: number): string {
	const times = timetableQuery.data?.day_time || [];
	const label = times[period - 1];
	if (!label) return '';
	const inParens = label.match(/\(([^)]+)\)/)?.[1] ?? label;
	return inParens.split(/[~-]/)[0].trim();
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

<div class="max-w-4xl mx-auto px-4 pt-4 pb-1 sm:pt-5 sm:pb-0 sm:px-4">
	<h1 class="sr-only print:hidden">시간표</h1>

	<!-- Printed heading. Screen readers already have the h1 above, and on paper
	     this is the only thing identifying the sheet. -->
	<h1 class="hidden print:block mb-8 text-center text-2xl font-bold tracking-tight text-foreground">
		{printTitle || DEFAULT_PRINT_TITLE}
	</h1>

	<!-- Header: Week Selector -->
	<div class="mb-3 print:hidden">
		<SegmentedControl
			bind:value={selectedWeek}
			options={[
				{ value: 0, label: '이번 주', event: 'Week Toggle', eventProps: 'week=this' },
				{ value: 1, label: '다음 주', event: 'Week Toggle', eventProps: 'week=next' }
			]}
		/>
	</div>

	{#if timetableQuery.isLoading}
		<LoadingState />
	{:else if timetableQuery.error}
		<ErrorState error={timetableQuery.error} />
	{:else if !timetableQuery.data}
		<EmptyState />
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
					{#each Array(getMaxPeriods()) as _, i}
						<tr>
							<th scope="row" class="px-0.5 py-3 sm:py-6 border border-border text-center font-normal bg-muted">
								<div class="text-sm sm:text-lg font-semibold text-foreground whitespace-nowrap">{i + 1}교시</div>
								<div class="text-[11px] sm:text-base text-muted-foreground tabular-nums leading-tight">{getPeriodLabel(i + 1)}</div>
							</th>
							{#each (timetableQuery.data?.timetable || []) as day}
								<td
									data-replaced={day[i]?.replaced ? '' : undefined}
									class="border border-border py-3 sm:py-6 text-center {day[i]?.replaced ? 'bg-amber-100/70 dark:bg-amber-900/20' : 'bg-card'}"
								>
									{#if day[i]}
										<div
											class="truncate {subjectSizeClass(day[i].subject)} font-semibold {day[i].replaced ? 'text-amber-700 dark:text-amber-300' : 'text-foreground'}"
											title={day[i].subject}
										>{day[i].subject}</div>
										<div class="truncate text-sm sm:text-base mt-0.5 text-muted-foreground">{day[i].teacher}</div>
									{:else}
										<span class="text-muted-foreground/50 text-base sm:text-lg" aria-hidden="true">-</span>
										<span class="sr-only">수업 없음</span>
									{/if}
								</td>
							{/each}
						</tr>
					{/each}
				</tbody>
			</table>
		</HScroll>
		<!-- Print controls: the title that will head the sheet, and the action. -->
		<div class="mt-3 flex items-center gap-2 print:hidden">
			<label for="print-title" class="sr-only">인쇄 제목</label>
			<input
				id="print-title"
				type="text"
				bind:value={printTitle}
				placeholder={DEFAULT_PRINT_TITLE}
				class="h-10 flex-1 min-w-0 px-3.5 rounded-lg bg-muted text-sm text-foreground placeholder:text-muted-foreground"
			/>
			<PillButton text="인쇄" variant="secondary" onclick={() => window.print()} />
		</div>

		{#if timetableQuery.data}
			{@const editedAt = timetableQuery.data.editedAt}
			<p class="mt-3 text-xs text-muted-foreground pb-10 print:hidden">
				업데이트: <span title={formatAbsolute(editedAt)}>{now === null ? formatAbsolute(editedAt) : formatRelative(editedAt, now)}</span>
			</p>
		{/if}
	{/if}
</div>
