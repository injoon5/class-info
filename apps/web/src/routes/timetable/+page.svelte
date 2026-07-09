<script lang="ts">
import { onMount } from 'svelte';
import { useQuery } from 'convex-svelte';
import { api } from "@class-info/backend/convex/_generated/api";
import LoadingState from '../../components/LoadingState.svelte';
import ErrorState from '../../components/ErrorState.svelte';
import EmptyState from '../../components/EmptyState.svelte';
import SegmentedControl from '../../components/SegmentedControl.svelte';
import type { PageData } from './$types.js';

let { data }: { data: PageData } = $props();

let selectedWeek: number = $state(0); // 0: this week, 1: next week

let gridBlurred = $state(false);
let blurTimerId: ReturnType<typeof setTimeout> | null = null;
let effectMounted = false;

$effect(() => {
  selectedWeek;
  if (!effectMounted) { effectMounted = true; return; }
  gridBlurred = true;
  if (blurTimerId !== null) clearTimeout(blurTimerId);
  blurTimerId = setTimeout(() => { gridBlurred = false; blurTimerId = null; }, 200);
  return () => { if (blurTimerId !== null) { clearTimeout(blurTimerId); blurTimerId = null; } };
});

// Scroll gradient state
let scrollContainer = $state<HTMLDivElement>();
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

// Highlight today's column (this week only, Mon–Fri)
function getNowInKst(): Date {
	const now = new Date();
	const utc = now.getTime() + now.getTimezoneOffset() * 60_000;
	return new Date(utc + 9 * 60 * 60_000);
}
const kstDay = getNowInKst().getDay();
const todayColIndex = kstDay >= 1 && kstDay <= 5 ? kstDay - 1 : -1;
const highlightCol = $derived(selectedWeek === 0 ? todayColIndex : -1);

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
	<title>시간표 - 1학년 3반</title>
	<meta name="description" content="정확한 시간표를 변경사항까지 한 번에 확인하세요. " />

	<!-- Open Graph -->
	<meta property="og:title" content="시간표 - 1학년 3반" />
	<meta property="og:description" content="정확한 시간표를 변경사항까지 한 번에 확인하세요. " />
	<meta property="og:url" content="https://timefor.school" />
	<meta property="og:type" content="website" />
	<meta property="og:site_name" content="TimeforSchool" />

	<!-- Twitter Card -->
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content="시간표 - 1학년 3반" />
	<meta name="twitter:description" content="정확한 시간표를 변경사항까지 한 번에 확인하세요. " />
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="max-w-4xl mx-auto px-4 pt-4 pb-12 sm:pt-5">
	<!-- Week selector -->
	<div class="mb-4">
		<SegmentedControl
			options={[
				{ value: 0, label: '이번 주', sEventProps: 'week=this' },
				{ value: 1, label: '다음 주', sEventProps: 'week=next' },
			]}
			value={selectedWeek}
			onchange={(v) => selectedWeek = v}
			label="주 선택"
			sEvent="Week Toggle"
		/>
	</div>

	{#if timetableQuery.isLoading}
		<LoadingState />
	{:else if timetableQuery.error}
		<ErrorState error={timetableQuery.error} />
	{:else if !timetableQuery.data}
		<EmptyState message="시간표가 없습니다" />
	{:else}
		<div class="card overflow-hidden">
			<div class="relative">
				<!-- Left gradient -->
				<div class="absolute left-0 top-0 bottom-0 w-8 z-10 pointer-events-none transition-opacity duration-200"
					 style="background: linear-gradient(to right, var(--surface), transparent); opacity: {scrollLeft > 0 ? 1 : 0};"></div>

				<!-- Right gradient -->
				<div class="absolute right-0 top-0 bottom-0 w-8 z-10 pointer-events-none transition-opacity duration-200"
					 style="background: linear-gradient(to left, var(--surface), transparent); opacity: {scrollRight > 0 ? 1 : 0};"></div>

				<div class="overflow-x-auto" bind:this={scrollContainer} onscroll={updateGradients}
					style="transition: filter 150ms ease, opacity 150ms ease; {gridBlurred ? 'filter: blur(4px); opacity: 0.7;' : ''}">
					<table class="w-full min-w-[19rem] table-fixed border-separate border-spacing-0">
						<colgroup>
							<col class="w-14 sm:w-20" />
							{#each dayNames as _}
								<col />
							{/each}
						</colgroup>
						<thead>
							<tr>
								<th class="py-2.5 sm:py-3 border-b border-[var(--separator)]"><span class="sr-only">교시</span></th>
								{#each dayNames as name, di}
									<th class="py-2.5 sm:py-3 text-center border-b border-[var(--separator)]
										{di === highlightCol ? 'bg-neutral-950/[0.03] dark:bg-white/[0.04]' : ''}">
										<span class="text-sm sm:text-base font-semibold
											{di === highlightCol ? 'text-neutral-900 dark:text-white' : 'text-neutral-500 dark:text-neutral-400'}">{name}</span>
										{#if di === highlightCol}
											<span class="block mx-auto mt-1 w-1 h-1 rounded-full bg-neutral-900 dark:bg-white" aria-hidden="true"></span>
										{/if}
									</th>
								{/each}
							</tr>
						</thead>
						<tbody>
							{#each Array(getMaxPeriods()) as _, i}
								<tr>
									<td class="py-3.5 sm:py-5 text-center whitespace-nowrap {i > 0 ? 'border-t border-[var(--separator)]' : ''}">
										<div class="text-sm sm:text-base font-semibold tabular-nums text-neutral-500 dark:text-neutral-400">{i + 1}</div>
										<div class="text-[11px] sm:text-xs tabular-nums text-neutral-400 dark:text-neutral-500 mt-0.5">{getPeriodLabel(i + 1)}</div>
									</td>
									{#each (timetableQuery.data?.timetable || []) as day, di}
										<td class="py-3.5 sm:py-5 px-1 text-center align-middle
											{i > 0 ? 'border-t border-[var(--separator)]' : ''}
											{di === highlightCol ? 'bg-neutral-950/[0.03] dark:bg-white/[0.04]' : ''}">
											{#if day[i]}
												<div class="text-[15px] sm:text-lg font-semibold tracking-[-0.01em] leading-tight
													{day[i].replaced ? 'text-amber-600 dark:text-amber-400' : 'text-neutral-900 dark:text-neutral-100'}">
													{day[i].subject}
												</div>
												{#if day[i].teacher}
													<div class="text-xs sm:text-sm mt-1 font-medium text-neutral-400 dark:text-neutral-500">{day[i].teacher}</div>
												{/if}
											{:else}
												<span class="text-neutral-300 dark:text-neutral-600 text-sm" aria-label="수업 없음">—</span>
											{/if}
										</td>
									{/each}
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</div>
		</div>

		{#if timetableQuery.data}
			<div class="mt-3 flex items-center justify-between gap-3 px-0.5">
				<p class="text-xs text-neutral-400 dark:text-neutral-500">
					업데이트: {new Date(timetableQuery.data.editedAt).toLocaleString('ko-KR', {
						year: 'numeric',
						month: 'long',
						day: 'numeric',
						hour: '2-digit',
						minute: '2-digit'
					})}
				</p>
				<p class="text-xs text-amber-600 dark:text-amber-400 shrink-0">
					<span class="font-semibold">노란색</span>은 변경된 수업
				</p>
			</div>
		{/if}
	{/if}
</div>
