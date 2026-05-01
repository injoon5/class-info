<script lang="ts">
import { onMount } from 'svelte';
import { useQuery } from 'convex-svelte';
import { api } from "@class-info/backend/convex/_generated/api";
import LoadingState from '../../components/LoadingState.svelte';
import ErrorState from '../../components/ErrorState.svelte';
import EmptyState from '../../components/EmptyState.svelte';
import Drawer from '../../components/Drawer.svelte';
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

let selectedMealType = $state("중식");

let gridBlurred = $state(false);
let blurTimerId: ReturnType<typeof setTimeout> | null = null;
let effectMounted = false;

$effect(() => {
  selectedMealType;
  if (!effectMounted) { effectMounted = true; return; }
  gridBlurred = true;
  if (blurTimerId !== null) clearTimeout(blurTimerId);
  blurTimerId = setTimeout(() => { gridBlurred = false; blurTimerId = null; }, 200);
  return () => { if (blurTimerId !== null) { clearTimeout(blurTimerId); blurTimerId = null; } };
});

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

let hasDinner = $derived(
  (mealsQuery.data?.availableMealTypes ?? []).includes("석식")
);

function mealKey(type: string): string {
  return type === '중식' ? 'lunch' : 'dinner';
}

function formatDateFull(dateStr: string): { year: number; month: number; day: number; weekday: string } {
  const y = Number(dateStr.slice(0, 4));
  const m = Number(dateStr.slice(4, 6));
  const d = Number(dateStr.slice(6, 8));
  const date = new Date(y, m - 1, d);
  const weekday = date.toLocaleDateString('ko-KR', { weekday: 'short' });
  return { year: y, month: m, day: d, weekday };
}

function formatDateKorean(dateStr: string): string {
  const { month: m, day: d, weekday } = formatDateFull(dateStr);
  return `${m}/${d} (${weekday})`;
}

// ── Meal drawer ───────────────────────────────────────────────────────────────

type SelectedMeal = { meal: MealDoc; dateInfo: ReturnType<typeof formatDateFull> } | null;
let selectedMeal = $state<SelectedMeal>(null);

function openMealDrawer(day: any) {
  const meal = day[mealKey(selectedMealType)] as MealDoc | null;
  if (!meal) return;
  selectedMeal = { meal, dateInfo: formatDateFull(day.date) };
}

onMount(() => {
  updateGradients();
  const resizeObserver = new ResizeObserver(() => { updateGradients(); });
  if (scrollContainer) resizeObserver.observe(scrollContainer);
  return () => { resizeObserver.disconnect(); };
});
</script>

<svelte:head>
  <title>급식 - 1학년 3반</title>
  <meta name="description" content="정확한 급식을 한 눈에 확인하세요. " />
  <meta property="og:title" content="급식 - 1학년 3반" />
  <meta property="og:description" content="정확한 급식을 한 눈에 확인하세요. " />
  <meta property="og:url" content="https://timefor.school" />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="TimeforSchool" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="급식 - 1학년 3반" />
  <meta name="twitter:description" content="정확한 급식을 한 눈에 확인하세요. " />
  <meta name="robots" content="noindex" />
</svelte:head>

<div class="max-w-4xl mx-auto px-4 pt-4 pb-2 sm:pt-5">
  {#if mealsQuery.isLoading}
    <LoadingState />
  {:else if mealsQuery.error}
    <ErrorState error={mealsQuery.error} />
  {:else if !mealsQuery.data || ((mealsQuery.data.thisWeek?.days ?? []).every((d: any) => d[mealKey(selectedMealType)] === null) && (mealsQuery.data.nextWeek?.days ?? []).every((d: any) => d[mealKey(selectedMealType)] === null))}
    <EmptyState />
  {:else}
    {#if hasDinner}
      <div class="flex justify-center mb-3">
        <div class="relative flex w-full rounded-xl bg-neutral-200 dark:bg-neutral-800 p-1 shadow-inner transition-colors h-9 sm:h-11 text-sm sm:text-base">
          <div
            class="absolute top-1 h-7 sm:h-9 w-[calc(50%-0.25rem)] rounded-lg bg-white dark:bg-neutral-700 shadow transition-transform duration-300 ease-in-out z-0"
            style="transform: translateX({selectedMealType === '중식' ? 0 : 100}%);"
            aria-hidden="true"
          ></div>
          <button
            class="flex-1 relative z-10 px-3 py-1 rounded-lg font-medium transition-colors
              {selectedMealType === '중식' ? 'text-neutral-900 dark:text-neutral-100' : 'text-neutral-600 dark:text-neutral-300'}"
            onclick={() => selectedMealType = '중식'}
            aria-pressed={selectedMealType === '중식'}
            type="button"
            data-s-event="Meal Type Toggle"
            data-s-event-props="type=lunch"
          >중식</button>
          <button
            class="flex-1 relative z-10 px-3 py-1 rounded-lg font-medium transition-colors
              {selectedMealType === '석식' ? 'text-neutral-900 dark:text-neutral-100' : 'text-neutral-600 dark:text-neutral-300'}"
            onclick={() => selectedMealType = '석식'}
            aria-pressed={selectedMealType === '석식'}
            type="button"
            data-s-event="Meal Type Toggle"
            data-s-event-props="type=dinner"
          >석식</button>
        </div>
      </div>
    {/if}
    <div class="relative">
      <!-- Left gradient -->
      <div class="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-white dark:from-neutral-900 to-transparent z-10 pointer-events-none transition-opacity duration-200"
           style="opacity: {scrollLeft > 0 ? 1 : 0};"
           bind:this={leftGradient}></div>
      <!-- Right gradient -->
      <div class="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white dark:from-neutral-900 to-transparent z-10 pointer-events-none transition-opacity duration-200"
           style="opacity: {scrollRight > 0 ? 1 : 0};"
           bind:this={rightGradient}></div>

      <div class="overflow-x-auto relative" bind:this={scrollContainer} onscroll={updateGradients}
        style="transition: filter 150ms ease, opacity 150ms ease; {gridBlurred ? 'filter: blur(4px); opacity: 0.7;' : ''}">
        {#each [
          { days: mealsQuery.data.thisWeek.days, class: "" },
          { days: mealsQuery.data.nextWeek.days, class: "mt-3" }
        ] as week}
        <div class={`mb-4 grid grid-cols-5 sm:grid-cols-5 min-w-[37rem] divide-x divide-neutral-200 dark:divide-neutral-700 border border-neutral-200 dark:border-neutral-700 rounded-lg`}>
          {#each week.days as day}
            {@const hasMeal = !!(day as any)[mealKey(selectedMealType)]}
            <button
              type="button"
              onclick={() => openMealDrawer(day)}
              disabled={!hasMeal}
              class="bg-white dark:bg-neutral-900 p-2 sm:px-3 sm:py-2 first:rounded-l-lg last:rounded-r-lg flex flex-col justify-between min-h-[15rem] text-left w-full
                {hasMeal ? 'cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800/70 transition-colors' : 'cursor-default'}"
            >
              <div>
                <h2 class="text-base sm:text-lg font-bold text-neutral-800 dark:text-neutral-100">{formatDateKorean(day.date)}</h2>
                {#if hasMeal}
                  <ul class="mt-2 space-y-1 text-neutral-800 dark:text-neutral-200">
                    {#each (day as any)[mealKey(selectedMealType)].dishes as dish}
                      <li class="text-sm sm:text-base truncate max-w-full overflow-hidden whitespace-nowrap" title={dish}>{dish}</li>
                    {/each}
                  </ul>
                {:else}
                  <p class="mt-2 text-neutral-500">급식 정보가 없습니다</p>
                {/if}
              </div>
              <div class="mt-2 min-h-[1.5rem] flex items-end">
                {#if (day as any)[mealKey(selectedMealType)]?.calories}
                  <p class="text-sm sm:text-base text-neutral-500">{(day as any)[mealKey(selectedMealType)].calories}</p>
                {/if}
              </div>
            </button>
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

<!-- Meal detail drawer -->
<Drawer
  open={selectedMeal !== null}
  onclose={() => selectedMeal = null}
>
  {#snippet header()}
    {#if selectedMeal}
      <p class="text-xs font-medium text-neutral-400 dark:text-neutral-500 mb-1 tracking-wide">
        {selectedMeal.dateInfo.year}년
      </p>
      <div class="flex items-baseline gap-2 flex-wrap">
        <h2 class="text-2xl font-bold leading-none text-neutral-900 dark:text-neutral-100">
          {selectedMeal.dateInfo.month}월 {selectedMeal.dateInfo.day}일
        </h2>
        <span class="text-base text-neutral-500 dark:text-neutral-400 leading-none">{selectedMeal.dateInfo.weekday}요일</span>
        <span class="text-xs font-semibold px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 leading-none">
          {selectedMeal.meal.mealType}
        </span>
      </div>
    {/if}
  {/snippet}

  <!-- Dish list -->
  {#if selectedMeal}
    <ul class="space-y-2">
      {#each selectedMeal.meal.dishes as dish}
        <li class="flex items-start gap-2.5 py-2 border-b border-neutral-100 dark:border-neutral-800 last:border-0">
          <span class="mt-1.5 w-1.5 h-1.5 rounded-full bg-neutral-300 dark:bg-neutral-600 flex-shrink-0"></span>
          <span class="text-sm text-neutral-800 dark:text-neutral-100 leading-snug">{dish}</span>
        </li>
      {/each}
    </ul>

    {#if selectedMeal.meal.calories || selectedMeal.meal.nutrients}
      <div class="mt-4 pt-4 border-t border-neutral-100 dark:border-neutral-800 space-y-2">
        {#if selectedMeal.meal.calories}
          <div class="flex items-center gap-2">
            <span class="text-xs font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wide w-12">열량</span>
            <span class="text-sm text-neutral-700 dark:text-neutral-300">{selectedMeal.meal.calories}</span>
          </div>
        {/if}
        {#if selectedMeal.meal.nutrients}
          <div class="flex items-start gap-2">
            <span class="text-xs font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wide w-12 pt-0.5">영양</span>
            <span class="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed">{selectedMeal.meal.nutrients}</span>
          </div>
        {/if}
      </div>
    {/if}

    {#if selectedMeal.meal.originInfo}
      <p class="mt-4 text-xs text-neutral-400 dark:text-neutral-500 leading-relaxed">{selectedMeal.meal.originInfo}</p>
    {/if}
  {/if}
</Drawer>
