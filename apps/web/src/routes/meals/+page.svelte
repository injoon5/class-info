<script lang="ts">
import { onMount } from 'svelte';
import { useQuery } from 'convex-svelte';
import { api } from "@class-info/backend/convex/_generated/api";
import LoadingState from '../../components/LoadingState.svelte';
import ErrorState from '../../components/ErrorState.svelte';
import EmptyState from '../../components/EmptyState.svelte';
import type { PageData } from './$types.js';

type MealDoc = {
  _id: string;
  date: string; // YYYYMMDD
  mealType: string; // 중식
  dishes: string[];
  originInfo: string;
  calories: string | null;
  nutrients: string | null;
  schoolName: string;
  editedAt: number;
};

function getNowInKst(): Date {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60_000;
  return new Date(utc + 9 * 60 * 60_000);
}


let { data }: { data: PageData } = $props();

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

const mealsQuery = useQuery(
  (api as any).meals.getTwoWeeks,
  () => ({}),
  () => ({ initialData: data.twoWeeks, keepPreviousData: true })
);

// no client-side grouping; server returns normalized Mon-Fri days

function formatDateKorean(dateStr: string): string {
  const y = Number(dateStr.slice(0,4));
  const m = Number(dateStr.slice(4,6));
  const d = Number(dateStr.slice(6,8));
  const date = new Date(y, m - 1, d);
  const weekday = date.toLocaleDateString('ko-KR', { weekday: 'short' });
  return `${m}/${d} (${weekday})`;
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
	<title>급식 - 3학년 4반</title>
	<meta name="description" content="정확한 급식을 한 눈에 확인하세요. " />

	<!-- Open Graph -->
	<meta property="og:title" content="급식 - 3학년 4반" />
	<meta property="og:description" content="정확한 급식을 한 눈에 확인하세요. " />
	<meta property="og:url" content="https://timefor.school" />
	<meta property="og:type" content="website" />
	<meta property="og:site_name" content="TimeforSchool" />

	<!-- Twitter Card -->
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content="급식 - 3학년 4반" />
	<meta name="twitter:description" content="정확한 급식을 한 눈에 확인하세요. " />
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="max-w-4xl mx-auto px-4 py-2">
  {#if mealsQuery.isLoading}
    <LoadingState />
  {:else if mealsQuery.error}
    <ErrorState error={mealsQuery.error} />
  {:else if !mealsQuery.data || ((mealsQuery.data.thisWeek?.days ?? []).every((d: any) => d.meal === null) && (mealsQuery.data.nextWeek?.days ?? []).every((d: any) => d.meal === null))}
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
      
      <div class="overflow-x-auto relative" bind:this={scrollContainer} onscroll={updateGradients}>
        {#each [
          { days: mealsQuery.data.thisWeek.days, class: "" },
          { days: mealsQuery.data.nextWeek.days, class: "mt-3" }
        ] as week}
        <div class={`mb-4 grid grid-cols-5 sm:grid-cols-5 min-w-[37rem] divide-x divide-neutral-200 dark:divide-neutral-700 border border-neutral-200 dark:border-neutral-700 rounded-lg`}>
          {#each week.days as day}
            <div class="bg-white dark:bg-neutral-900 p-2 sm:px-3 sm:py-2 first:rounded-l-lg last:rounded-r-lg flex flex-col justify-between min-h-[15rem]">
              <div>
                <div class="flex items-center justify-between">
                  <h2 class="text-base sm:text-lg font-bold text-neutral-800 dark:text-neutral-100">{formatDateKorean(day.date)}</h2>
                </div>
                {#if day.meal}
                  <ul class="mt-2 space-y-1 text-neutral-800 dark:text-neutral-200">
                    {#each day.meal.dishes as dish}
                      <li class="text-sm sm:text-base truncate max-w-full overflow-hidden whitespace-nowrap" title={dish}>{dish}</li>
                    {/each}
                  </ul>
                {:else}
                  <p class="mt-2 text-neutral-500">급식 정보가 없습니다</p>
                {/if}
              </div>
              <div class="mt-2 min-h-[1.5rem] flex items-end">
                {#if day.meal && day.meal.calories}
                  <p class="text-sm sm:text-base text-neutral-500">{day.meal.calories}</p>
                {/if}
              </div>
            </div>
          {/each}
        </div>
        {/each}
      </div>
    </div>
    <div class="block sm:hidden mt-1 text-center text-xs text-neutral-500 select-none pointer-events-none">
      좌우로 스크롤하세요 →
    </div>
  {/if}
</div>
