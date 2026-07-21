<script lang="ts">
import { useQuery } from 'convex-svelte';
import { api } from "@class-info/backend/convex/_generated/api";
import LoadingState from '../../components/LoadingState.svelte';
import ErrorState from '../../components/ErrorState.svelte';
import EmptyState from '../../components/EmptyState.svelte';
import HScroll from '../../components/HScroll.svelte';
import SegmentedControl from '../../components/SegmentedControl.svelte';
import { createBlurPulse } from '$lib/blurPulse.svelte';
import type { PageData } from './$types.js';

let { data }: { data: PageData } = $props();

let selectedWeek = $state(0); // 0: this week, 1: next week

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
				<table class="w-full min-w-[18rem] table-fixed border border-neutral-200 dark:border-neutral-700 border-collapse shadow-sm mx-auto">
				<thead>
					<tr class="bg-neutral-100 dark:bg-neutral-800">
						<th class="px-1 py-3 text-center text-base sm:text-lg text-neutral-600 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700"> </th>
						{#each dayNames as name}
							<th class="px-1 py-2 text-center text-base font-medium sm:text-lg text-neutral-600 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700">{name}</th>
						{/each}
					</tr>
				</thead>
				<tbody>
					{#each Array(getMaxPeriods()) as _, i}
						<tr>
							<td class=" py-3 sm:py-6 border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-200 whitespace-nowrap text-center bg-neutral-100 dark:bg-neutral-800">
								<div class="text-base sm:text-lg font-medium">{i + 1}교시</div>
								<div class="text-sm sm:text-lg text-neutral-500 dark:text-neutral-400">{getPeriodLabel(i + 1)}</div>
							</td>
							{#each (timetableQuery.data?.timetable || []) as day}
								<td class="border border-neutral-200 dark:border-neutral-700 py-3 sm:py-6 text-center {day[i]?.replaced ? 'bg-yellow-100 dark:bg-yellow-900/20' : 'bg-neutral-50 dark:bg-neutral-900'}">
									{#if day[i]}
										<!-- Subject cell -->
										<div class="flex items-center justify-center gap-2">
											<div>
												<span class="text-md sm:text-xl font-semibold text-neutral-800 dark:text-neutral-200">{day[i].subject}</span>
											</div>
										</div>
										<div class="text-sm sm:text-lg mt-0.5 font-medium text-neutral-500 dark:text-neutral-400">{day[i].teacher}</div>
									{:else}
										<span class="text-neutral-400 text-base sm:text-lg">-</span>
									{/if}
								</td>
							{/each}
						</tr>
					{/each}
				</tbody>
			</table>
		</HScroll>
		{#if timetableQuery.data}
			<p class="mt-3 text-xs text-neutral-500 dark:text-neutral-400 pb-10">
				업데이트: {new Date(timetableQuery.data.editedAt).toLocaleString('ko-KR', {
					year: 'numeric',
					month: 'long',
					day: 'numeric',
					hour: '2-digit',
					minute: '2-digit'
				})}
			</p>
		{/if}
	{/if}
</div>
