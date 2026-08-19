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
import type { PageData } from './$types.js';

const { data }: { data: PageData } = $props();

let selectedWeek = $state(0); // 0: this week, 1: next week

// Relative time is resolved after mount so SSR and hydration agree on the markup.
let now = $state<number | null>(null);
onMount(() => { now = Date.now(); });

const blur = createBlurPulse();
$effect(() => { selectedWeek; blur.pulse(); });

const timetableQuery = useQuery(
	api.timetable.getByWeek,
	() => ({ week: selectedWeek }),
	() => ({
		initialData: selectedWeek === 0 ? data.timetable : undefined,
		keepPreviousData: true
	})
);

const dayNames = ['월', '화', '수', '목', '금'];

function getMaxPeriods(): number {
	const tt = (timetableQuery.data?.timetable || []) as Array<Array<{ period: number }>>;
	return tt.reduce((max: number, day) => Math.max(max, day.length), 0);
}

function getPeriodLabel(period: number): string {
	const times = timetableQuery.data?.day_time || [];
	const label = times[period - 1];
	return label ? label.replace(/^.*\(([^)]+)\)$/, '$1') : "?";
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
	<h1 class="sr-only">시간표</h1>
	<!-- Header: Week Selector -->
	<div class="mb-3">
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
				<table class="w-full min-w-[18rem] table-fixed border border-border border-collapse overflow-hidden rounded-2xl mx-auto">
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
								<td class="border border-border py-3 sm:py-6 text-center {day[i]?.replaced ? 'bg-amber-100/70 dark:bg-amber-900/20' : 'bg-card'}">
									{#if day[i]}
										<div class="text-[15px] sm:text-xl font-semibold {day[i].replaced ? 'text-amber-700 dark:text-amber-300' : 'text-foreground'}">{day[i].subject}</div>
										<div class="text-sm sm:text-base mt-0.5 font-medium text-muted-foreground">{day[i].teacher}</div>
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
		{#if timetableQuery.data}
			{@const editedAt = timetableQuery.data.editedAt}
			<p class="mt-3 text-xs text-muted-foreground pb-10">
				업데이트: <span title={formatAbsolute(editedAt)}>{now === null ? formatAbsolute(editedAt) : formatRelative(editedAt, now)}</span>
			</p>
		{/if}
	{/if}
</div>
