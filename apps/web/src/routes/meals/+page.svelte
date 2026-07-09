<script lang="ts">
import { onMount } from 'svelte';
import { useQuery } from 'convex-svelte';
import { api } from "@class-info/backend/convex/_generated/api";
import LoadingState from '../../components/LoadingState.svelte';
import ErrorState from '../../components/ErrorState.svelte';
import EmptyState from '../../components/EmptyState.svelte';
import SegmentedControl from '../../components/SegmentedControl.svelte';
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

const kstNow = getNowInKst();
const todayStr = `${kstNow.getFullYear()}${String(kstNow.getMonth() + 1).padStart(2, '0')}${String(kstNow.getDate()).padStart(2, '0')}`;

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

<div class="max-w-4xl mx-auto px-4 pt-4 pb-12 sm:pt-5">
  {#if mealsQuery.isLoading}
    <LoadingState />
  {:else if mealsQuery.error}
    <ErrorState error={mealsQuery.error} />
  {:else if !mealsQuery.data || ((mealsQuery.data.thisWeek?.days ?? []).every((d: any) => d[mealKey(selectedMealType)] === null) && (mealsQuery.data.nextWeek?.days ?? []).every((d: any) => d[mealKey(selectedMealType)] === null))}
    <EmptyState message="급식 정보가 없습니다" />
  {:else}
    {#if hasDinner}
      <div class="mb-4">
        <SegmentedControl
          options={[
            { value: '중식', label: '중식', sEventProps: 'type=lunch' },
            { value: '석식', label: '석식', sEventProps: 'type=dinner' },
          ]}
          value={selectedMealType}
          onchange={(v) => selectedMealType = v}
          label="식사 선택"
          sEvent="Meal Type Toggle"
        />
      </div>
    {/if}
    <div class="relative">
      <!-- Left gradient -->
      <div class="absolute left-0 top-0 bottom-0 w-8 z-10 pointer-events-none transition-opacity duration-200 rounded-l-2xl"
           style="background: linear-gradient(to right, var(--page), transparent); opacity: {scrollLeft > 0 ? 1 : 0};"></div>
      <!-- Right gradient -->
      <div class="absolute right-0 top-0 bottom-0 w-8 z-10 pointer-events-none transition-opacity duration-200 rounded-r-2xl"
           style="background: linear-gradient(to left, var(--page), transparent); opacity: {scrollRight > 0 ? 1 : 0};"></div>

      <div class="overflow-x-auto" bind:this={scrollContainer} onscroll={updateGradients}
        style="transition: filter 150ms ease, opacity 150ms ease; {gridBlurred ? 'filter: blur(4px); opacity: 0.7;' : ''}">
        {#each [
          { days: mealsQuery.data.thisWeek.days },
          { days: mealsQuery.data.nextWeek.days }
        ] as week}
        <div class="card mb-3 grid grid-cols-5 min-w-[37rem] divide-x divide-[var(--separator)] overflow-hidden">
          {#each week.days as day}
            {@const hasMeal = !!(day as any)[mealKey(selectedMealType)]}
            {@const isToday = day.date === todayStr}
            <button
              type="button"
              onclick={() => openMealDrawer(day)}
              disabled={!hasMeal}
              class="relative p-2.5 sm:p-3 flex flex-col justify-between min-h-[15rem] text-left w-full transition-colors duration-100
                {isToday ? 'bg-neutral-950/[0.03] dark:bg-white/[0.04]' : ''}
                {hasMeal ? 'cursor-pointer hover:bg-neutral-950/[0.04] dark:hover:bg-white/[0.06] active:bg-neutral-950/[0.06] dark:active:bg-white/[0.08]' : 'cursor-default'}"
            >
              <div>
                <h2 class="text-sm sm:text-[15px] font-semibold tabular-nums flex items-center gap-1.5
                  {isToday ? 'text-neutral-900 dark:text-white' : 'text-neutral-500 dark:text-neutral-400'}">
                  {formatDateKorean(day.date)}
                  {#if isToday}
                    <span class="w-1 h-1 rounded-full bg-neutral-900 dark:bg-white" aria-hidden="true"></span>
                  {/if}
                </h2>
                {#if hasMeal}
                  <ul class="mt-2.5 space-y-1.5 text-neutral-800 dark:text-neutral-200">
                    {#each (day as any)[mealKey(selectedMealType)].dishes as dish}
                      <li class="text-sm sm:text-[15px] leading-snug truncate max-w-full overflow-hidden whitespace-nowrap" title={dish}>{dish}</li>
                    {/each}
                  </ul>
                {:else}
                  <p class="mt-2.5 text-sm text-neutral-400 dark:text-neutral-500">급식 정보가 없습니다</p>
                {/if}
              </div>
              <div class="mt-2 min-h-[1.25rem] flex items-end">
                {#if (day as any)[mealKey(selectedMealType)]?.calories}
                  <p class="text-xs sm:text-sm tabular-nums text-neutral-400 dark:text-neutral-500">{(day as any)[mealKey(selectedMealType)].calories}</p>
                {/if}
              </div>
            </button>
          {/each}
        </div>
        {/each}
      </div>
    </div>
    <div class="block sm:hidden mt-1 text-center text-xs text-neutral-400 dark:text-neutral-500 select-none pointer-events-none">
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
        <h2 class="text-2xl font-bold tracking-[-0.02em] leading-none text-neutral-900 dark:text-neutral-100">
          {selectedMeal.dateInfo.month}월 {selectedMeal.dateInfo.day}일
        </h2>
        <span class="text-base text-neutral-500 dark:text-neutral-400 leading-none">{selectedMeal.dateInfo.weekday}요일</span>
        <span class="text-xs font-semibold px-2 py-0.5 rounded-full bg-neutral-950/[0.05] dark:bg-white/[0.08] text-neutral-600 dark:text-neutral-400 leading-none">
          {selectedMeal.meal.mealType}
        </span>
      </div>
    {/if}
  {/snippet}

  <!-- Dish list -->
  {#if selectedMeal}
    <ul class="space-y-0">
      {#each selectedMeal.meal.dishes as dish}
        <li class="flex items-start gap-2.5 py-2.5 border-b border-[var(--separator)] last:border-0">
          <span class="mt-[7px] w-1.5 h-1.5 rounded-full bg-neutral-300 dark:bg-neutral-600 flex-shrink-0"></span>
          <span class="text-[15px] text-neutral-800 dark:text-neutral-100 leading-snug">{dish}</span>
        </li>
      {/each}
    </ul>

    {#if selectedMeal.meal.calories || selectedMeal.meal.nutrients}
      {@const nutrientRows = selectedMeal.meal.nutrients
        ? selectedMeal.meal.nutrients.split(/<br\s*\/?>/i).map(s => s.trim()).filter(Boolean).map(s => {
            const idx = s.indexOf(' : ');
            return idx !== -1 ? [s.slice(0, idx).trim(), s.slice(idx + 3).trim()] : [s, ''];
          })
        : []}
      <div class="mt-4 pt-4 border-t border-[var(--separator)]">
        {#if selectedMeal.meal.calories}
          <div class="flex items-center gap-2 mb-3">
            <span class="text-xs font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wide">열량</span>
            <span class="text-sm tabular-nums text-neutral-700 dark:text-neutral-300">{selectedMeal.meal.calories}</span>
          </div>
        {/if}
        {#if nutrientRows.length > 0}
          <p class="text-xs font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wide mb-2">영양</p>
          <div class="grid grid-cols-3 gap-x-4 gap-y-1.5">
            {#each nutrientRows as [name, value]}
              <div class="flex items-baseline justify-between gap-1 border-b border-[var(--separator)] pb-1.5">
                <span class="text-xs text-neutral-500 dark:text-neutral-400 truncate">{name}</span>
                <span class="text-xs font-medium text-neutral-700 dark:text-neutral-300 tabular-nums flex-shrink-0">{value}</span>
              </div>
            {/each}
          </div>
        {/if}
      </div>
    {/if}
  {/if}
</Drawer>
