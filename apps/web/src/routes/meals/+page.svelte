<script lang="ts">
import { useQuery } from 'convex-svelte';
import { api } from "@class-info/backend/convex/_generated/api";
import LoadingState from '../../components/LoadingState.svelte';
import ErrorState from '../../components/ErrorState.svelte';
import EmptyState from '../../components/EmptyState.svelte';
import Drawer from '../../components/Drawer.svelte';
import HScroll from '../../components/HScroll.svelte';
import SegmentedControl from '../../components/SegmentedControl.svelte';
import { createBlurPulse } from '$lib/blurPulse.svelte';
import { getNowInKst, yyyymmdd } from '$lib/date';
import type { PageData } from './$types.js';

const todayStr = yyyymmdd(getNowInKst());

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

const { data }: { data: PageData } = $props();

let selectedMealType = $state("중식");

const blur = createBlurPulse();
$effect(() => { selectedMealType; blur.pulse(); });

const mealsQuery = useQuery(
  api.meals.getTwoWeeks,
  () => ({ weekStart: data.weekStart }),
  () => ({ initialData: data.twoWeeks, keepPreviousData: true })
);

const availableMealTypes = $derived(mealsQuery.data?.availableMealTypes ?? []);
const hasDinner = $derived(availableMealTypes.includes("석식"));

// If the selected meal type is no longer available (e.g. dinner data cleared
// while it was selected), fall back to lunch so the view can't dead-end.
$effect(() => {
  if (availableMealTypes.length > 0 && !availableMealTypes.includes(selectedMealType)) {
    selectedMealType = availableMealTypes[0];
  }
});

function mealKey(type: string): 'lunch' | 'dinner' {
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
</script>

<svelte:head>
  <title>급식 - 1학년 3반</title>
  <meta name="description" content="정확한 급식을 한 눈에 확인하세요. " />
  <meta property="og:title" content="급식 - 1학년 3반" />
  <meta property="og:description" content="정확한 급식을 한 눈에 확인하세요. " />
  <meta property="og:url" content="https://timefor.school/meals" />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="TimeforSchool" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="급식 - 1학년 3반" />
  <meta name="twitter:description" content="정확한 급식을 한 눈에 확인하세요. " />
  <meta name="robots" content="noindex" />
</svelte:head>

<div class="max-w-4xl mx-auto px-4 pt-4 pb-2 sm:pt-5">
  <h1 class="sr-only">급식</h1>
  {#if mealsQuery.isLoading}
    <LoadingState />
  {:else if mealsQuery.error}
    <ErrorState error={mealsQuery.error} />
  {:else if !mealsQuery.data || availableMealTypes.length === 0}
    <EmptyState />
  {:else}
    {#if hasDinner}
      <div class="mb-3">
        <SegmentedControl
          bind:value={selectedMealType}
          options={[
            { value: '중식', label: '중식', event: 'Meal Type Toggle', eventProps: 'type=lunch' },
            { value: '석식', label: '석식', event: 'Meal Type Toggle', eventProps: 'type=dinner' }
          ]}
        />
      </div>
    {/if}
    <HScroll blurred={blur.blurred}>
        {#each [
          { days: mealsQuery.data.thisWeek.days, class: "" },
          { days: mealsQuery.data.nextWeek.days, class: "mt-3" }
        ] as week}
        <div class={`mb-4 grid grid-cols-5 sm:grid-cols-5 min-w-[37rem] divide-x divide-border border border-border rounded-xl overflow-hidden`}>
          {#each week.days as day (day.date)}
            {@const hasMeal = !!(day as any)[mealKey(selectedMealType)]}
            {@const isTodayCol = day.date === todayStr}
            <button
              type="button"
              onclick={() => openMealDrawer(day)}
              disabled={!hasMeal}
              class="relative p-2.5 sm:px-3 sm:py-3 flex flex-col justify-between min-h-[15rem] text-left w-full transition-colors
                {isTodayCol ? 'bg-muted/60' : 'bg-card'}
                {hasMeal ? 'cursor-pointer pointer:hover:bg-muted' : 'cursor-default'}"
            >
              <div>
                <h2 class="text-sm sm:text-base font-semibold tabular-nums {isTodayCol ? 'text-foreground' : 'text-muted-foreground'}">{formatDateKorean(day.date)}</h2>
                {#if hasMeal}
                  <ul class="mt-2.5 space-y-1 text-foreground">
                    {#each (day as any)[mealKey(selectedMealType)].dishes as dish}
                      <li class="text-sm sm:text-list leading-snug truncate max-w-full overflow-hidden whitespace-nowrap" title={dish}>{dish}</li>
                    {/each}
                  </ul>
                {:else}
                  <p class="mt-2.5 text-sm text-muted-foreground">급식 정보가 없어요</p>
                {/if}
              </div>
              <div class="mt-2 min-h-[1.25rem] flex items-end">
                {#if (day as any)[mealKey(selectedMealType)]?.calories}
                  <p class="text-xs sm:text-sm text-muted-foreground tabular-nums">{(day as any)[mealKey(selectedMealType)].calories}</p>
                {/if}
              </div>
            </button>
          {/each}
        </div>
        {/each}
    </HScroll>
    <div class="block sm:hidden mt-1.5 text-center text-xs text-muted-foreground select-none pointer-events-none">
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
      <p class="text-sm font-semibold text-muted-foreground mb-1 tabular-nums">
        {selectedMeal.dateInfo.year}년
      </p>
      <div class="flex items-baseline gap-2 flex-wrap">
        <h2 class="text-2xl font-bold tracking-tight leading-tight text-foreground">
          {selectedMeal.dateInfo.month}월 {selectedMeal.dateInfo.day}일
        </h2>
        <span class="text-base text-muted-foreground leading-tight">{selectedMeal.dateInfo.weekday}요일</span>
        <span class="text-base font-semibold px-2.5 py-1 rounded-full bg-primary text-primary-foreground leading-tight">
          {selectedMeal.meal.mealType}
        </span>
      </div>
    {/if}
  {/snippet}

  <!-- Dish list -->
  {#if selectedMeal}
    <ul class="space-y-2">
      {#each selectedMeal.meal.dishes as dish}
        <li class="flex items-start gap-2.5 py-1">
          <span class="mt-2 w-1.5 h-1.5 rounded-full bg-muted-foreground/50 flex-shrink-0"></span>
          <span class="text-base text-foreground leading-snug">{dish}</span>
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
      <div class="mt-4 pt-4 border-t border-border">
        {#if selectedMeal.meal.calories}
          <div class="flex items-center gap-2 mb-3">
            <span class="text-sm font-semibold text-muted-foreground">열량</span>
            <span class="text-sm text-foreground tabular-nums">{selectedMeal.meal.calories}</span>
          </div>
        {/if}
        {#if nutrientRows.length > 0}
          <p class="text-sm font-semibold text-muted-foreground mb-2">영양</p>
          <div class="grid grid-cols-3 gap-x-4 gap-y-1.5">
            {#each nutrientRows as [name, value]}
              <div class="flex items-baseline justify-between gap-1 border-b border-border pb-1.5">
                <span class="text-xs text-muted-foreground truncate">{name}</span>
                <span class="text-xs text-foreground tabular-nums flex-shrink-0">{value}</span>
              </div>
            {/each}
          </div>
        {/if}
      </div>
    {/if}
  {/if}
</Drawer>
