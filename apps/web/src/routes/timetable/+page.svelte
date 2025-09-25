<script lang="ts">
import { useQuery } from 'convex-svelte';
import { api } from "@class-info/backend/convex/_generated/api";
import LoadingState from '../../components/LoadingState.svelte';
import ErrorState from '../../components/ErrorState.svelte';
import EmptyState from '../../components/EmptyState.svelte';
import type { PageData } from './$types.js';

let { data }: { data: PageData } = $props();

let selectedWeek: number = $state(0); // 0: this week, 1: next week

const timetableQuery = useQuery(
	(api as any).timetable.getByWeek,
	() => ({ week: selectedWeek }),
	() => ({
		initialData: selectedWeek === 0 ? data.timetable : undefined,
		keepPreviousData: true
	})
);

const dayNames = ['월', '화', '수', '목', '금'];

function getMaxPeriods(): number {
	const tt = (timetableQuery.data?.timetable || []) as Array<Array<{ period: number }>>;
	return tt.reduce((max: number, day: Array<{ period: number }>) => Math.max(max, day.length), 0);
}

function getPeriodLabel(period: number): string {
	const times = timetableQuery.data?.day_time || [];
	const label = times[period - 1];
	return label ? label.replace(/^.*\(([^)]+)\)$/, '$1') : "?";
}
</script>


<svelte:head>
	<title>시간표</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="max-w-4xl mx-auto p-4 ios-content-padding">
	<!-- Header: Week Selector -->
	<div class="flex justify-end gap-2 mb-3">
			<button
				class="px-3 py-1.5 rounded border text-sm font-medium transition
					{selectedWeek === 0 ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 border-neutral-900 dark:border-neutral-100' : 'bg-white dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200 border-neutral-300 dark:border-neutral-700'}"
				onclick={() => selectedWeek = 0}
				aria-pressed={selectedWeek === 0}
			>
				이번 주
			</button>
			<button
				class="px-3 py-1.5 rounded border text-sm font-medium transition
					{selectedWeek === 1 ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 border-neutral-900 dark:border-neutral-100' : 'bg-white dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200 border-neutral-300 dark:border-neutral-700'}"
				onclick={() => selectedWeek = 1}
				aria-pressed={selectedWeek === 1}
			>
				다음 주
			</button>
	</div>

	{#if timetableQuery.isLoading}
		<LoadingState />
	{:else if timetableQuery.error}
		<ErrorState error={timetableQuery.error} />
	{:else if !timetableQuery.data}
		<EmptyState />
	{:else}
		<div class="overflow-x-auto">
			<table class="w-full table-fixed border border-neutral-200 dark:border-neutral-700 shadow-sm mx-auto">
				<thead>
					<tr class="bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700">
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
												<span class="text-md sm:text-xl font-medium text-neutral-800 dark:text-neutral-200">{day[i].subject}</span>
											</div>
										</div>
										<div class="text-sm sm:text-lg mt-0.5 text-neutral-500 dark:text-neutral-400">{day[i].teacher}</div>
									{:else}
										<span class="text-neutral-400 text-base sm:text-lg">-</span>
									{/if}
								</td>
							{/each}
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
		{#if timetableQuery.data}
			<p class="mt-3 text-xs text-neutral-500 dark:text-neutral-400">
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
