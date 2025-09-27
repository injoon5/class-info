<script lang="ts">
import { onMount } from 'svelte';
import { useQuery } from 'convex-svelte';
import { api } from "@class-info/backend/convex/_generated/api";
import LoadingState from '../../components/LoadingState.svelte';
import ErrorState from '../../components/ErrorState.svelte';
import EmptyState from '../../components/EmptyState.svelte';
import type { PageData } from './$types.js';

let { data }: { data: PageData } = $props();

let selectedWeek: number = $state(0); // 0: this week, 1: next week

// Scroll gradient state
let scrollContainer = $state<HTMLDivElement>();
let leftGradient = $state<HTMLDivElement>();
let rightGradient = $state<HTMLDivElement>();
let scrollLeft = $state(0);
let scrollRight = $state(0);

function updateGradients() {
	if (!scrollContainer) return;
	
	const { scrollLeft: left, scrollWidth, clientWidth } = scrollContainer;
	const hasOverflow = scrollWidth > clientWidth;
	
	scrollLeft = hasOverflow ? left : 0;
	scrollRight = hasOverflow ? scrollWidth - clientWidth - left : 0;
}

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

onMount(() => {
	updateGradients();
	
	// Handle resize events
	const resizeObserver = new ResizeObserver(() => {
		updateGradients();
	});
	
	if (scrollContainer) {
		resizeObserver.observe(scrollContainer);
	}
	
	return () => {
		resizeObserver.disconnect();
	};
});
</script>


<svelte:head>
	<title>시간표 - 3학년 4반</title>
	<meta name="description" content="3학년 4반 학급 시간표입니다. 변경된 일정까지 한 번에 확인하세요. " />

	<!-- Open Graph -->
	<meta property="og:title" content="시간표 - 3학년 4반" />
	<meta property="og:description" content="3학년 4반 학급 시간표입니다. 변경된 일정까지 한 번에 확인하세요. " />
	<meta property="og:url" content="https://timefor.school" />
	<meta property="og:type" content="website" />
	<meta property="og:site_name" content="학급 공지사항" />

	<!-- Twitter Card -->
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content="시간표 - 3학년 4반" />
	<meta name="twitter:description" content="3학년 4반 학급 시간표입니다. 변경된 일정까지 한 번에 확인하세요. " />
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="max-w-4xl mx-auto px-4 py-1 sm:py-0 sm:px-4">
	<!-- Header: Week Selector -->
	<div class="flex justify-center mb-3">
		<div class="relative flex w-full rounded-xl bg-neutral-200 dark:bg-neutral-800 p-1 shadow-inner transition h-9 sm:h-11 text-sm sm:text-base">
			<!-- Sliding indicator -->
			<div
				class="absolute top-1 h-7 sm:h-9 w-[calc(50%-0.25rem)] rounded-lg bg-white dark:bg-neutral-700 shadow transition-transform duration-300 ease-in-out z-0"
				style="transform: translateX({(selectedWeek * 100)}%);"
				aria-hidden="true"
			></div>
			<button
				class="flex-1 relative z-10 px-3 py-1 rounded-lg font-medium transition
					{selectedWeek === 0 
						? 'text-neutral-900 dark:text-neutral-100'
						: 'text-neutral-600 dark:text-neutral-300'}"
				onclick={() => selectedWeek = 0}
				aria-pressed={selectedWeek === 0}
				type="button"
			>
				이번 주
			</button>
			<button
				class="flex-1 relative z-10 px-3 py-1 rounded-lg font-medium transition
					{selectedWeek === 1 
						? 'text-neutral-900 dark:text-neutral-100'
						: 'text-neutral-600 dark:text-neutral-300'}"
				onclick={() => selectedWeek = 1}
				aria-pressed={selectedWeek === 1}
				type="button"
			>
				다음 주
			</button>
		</div>
	</div>

	{#if timetableQuery.isLoading}
		<LoadingState />
	{:else if timetableQuery.error}
		<ErrorState error={timetableQuery.error} />
	{:else if !timetableQuery.data}
		<EmptyState />
	{:else}
		<div class="relative">
			<!-- Left gradient -->
			<div class="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-white dark:from-neutral-900 to-transparent z-10 pointer-events-none transition-opacity duration-200" 
				 style="opacity: {scrollLeft > 0 ? 1 : 0};" 
				 bind:this={leftGradient}></div>
			
			<!-- Right gradient -->
			<div class="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white dark:from-neutral-900 to-transparent z-10 pointer-events-none transition-opacity duration-200"
				 style="opacity: {scrollRight > 0 ? 1 : 0};"
				 bind:this={rightGradient}></div>
			
			<div class="overflow-x-auto" bind:this={scrollContainer} onscroll={updateGradients}>
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
			</div>
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
