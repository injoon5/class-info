<script lang="ts">
import { useQuery } from 'convex-svelte';
import { api } from "@class-info/backend/convex/_generated/api";
import LoadingState from '$lib/components/ui/LoadingState.svelte';
import ErrorState from '$lib/components/ui/ErrorState.svelte';
import EmptyState from '$lib/components/ui/EmptyState.svelte';
import HScroll from '$lib/components/ui/HScroll.svelte';
import SegmentedControl from '$lib/components/ui/SegmentedControl.svelte';
import { createBlurPulse } from '$lib/blurPulse.svelte';
import { formatAbsolute, formatRelative } from '$lib/date';
import { onMount } from 'svelte';
import type { PageData } from './$types.js';

const { data }: { data: PageData } = $props();

let selectedWeek = $state(0); // 0: this week, 1: next week

// Relative time is resolved after mount so SSR and hydration agree on the markup.
let now = $state<number | null>(null);

onMount(() => {
	now = Date.now();
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

<div class="max-w-4xl mx-auto px-4 pt-4 pb-1 sm:pt-5 sm:pb-0 sm:px-4 print-sheet">
	<h1 class="sr-only print:hidden">시간표</h1>

	<!-- Printed heading. Screen readers already have the h1 above, and on paper
	     this is the only thing identifying the sheet. -->
	<h1 class="hidden print:block mb-5 text-center text-2xl font-bold tracking-tight text-foreground">
		1학년 3반 시간표
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
		<EmptyState message="시간표가 없어요" />
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
		{@const editedAt = timetableQuery.data.editedAt}
		<div class="mt-3 flex items-center justify-between gap-3 pb-10 print:hidden">
			<p class="text-xs text-muted-foreground">
				업데이트: <span title={formatAbsolute(editedAt)}>{now === null ? formatAbsolute(editedAt) : formatRelative(editedAt, now)}</span>
			</p>
			<button
				type="button"
				onclick={() => window.print()}
				class="pressable touch-target text-xs font-semibold text-muted-foreground pointer:hover:text-foreground"
			>인쇄</button>
		</div>
	{/if}
</div>
