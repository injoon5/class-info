<script lang="ts">
import { useQuery } from 'convex-svelte';
import { api } from '@class-info/backend/convex/_generated/api';
import { CLASS_LABEL } from '@class-info/backend/convex/config';
import type { MealDay, PublicMeal } from '@class-info/backend/convex/validators';
import PageMeta from '$lib/components/PageMeta.svelte';
import LoadingState from '$lib/components/ui/LoadingState.svelte';
import ErrorState from '$lib/components/ui/ErrorState.svelte';
import EmptyState from '$lib/components/ui/EmptyState.svelte';
import Drawer from '$lib/components/ui/Drawer.svelte';
import HScroll from '$lib/components/ui/HScroll.svelte';
import SegmentedControl from '$lib/components/ui/SegmentedControl.svelte';
import FluidHeight from '$lib/components/ui/FluidHeight.svelte';
import { createBlurPulse } from '$lib/blurPulse.svelte';
import { relativeDayLabel, shortDate, ymdParts, type DateParts } from '$lib/date';
import { parseInfoRows } from '$lib/format';
import type { PageData } from './$types.js';

type MealType = '중식' | '석식';

const { data }: { data: PageData } = $props();

let selectedMealType = $state<MealType>('중식');

const blur = createBlurPulse();
$effect(() => {
	selectedMealType;
	blur.pulse();
});

const mealsQuery = useQuery(
	api.meals.getTwoWeeks,
	() => ({ weekStart: data.weekStart }),
	() => ({
		...(data.twoWeeks ? { initialData: data.twoWeeks } : {}),
		keepPreviousData: true
	})
);

const weeks = $derived(mealsQuery.data ? [mealsQuery.data.thisWeek.days, mealsQuery.data.nextWeek.days] : []);
const availableMealTypes = $derived(mealsQuery.data?.availableMealTypes ?? []);

// Fall back to whatever is served if the selected type disappears.
$effect(() => {
	const first = availableMealTypes[0];
	if (first && !availableMealTypes.includes(selectedMealType)) selectedMealType = first as MealType;
});

function mealFor(day: MealDay, type: MealType): PublicMeal | null {
	return type === '중식' ? day.lunch : day.dinner;
}

// On the 석식 tab the highlight stays on today until tonight's dinner is over,
// even though the rest of the app has already rolled over to the next day.
const todayDinner = $derived(weeks.flat().find((d) => d.date === data.todayYmd)?.dinner ?? null);
const highlightDay = $derived(
	selectedMealType === '석식' && !data.afterDinner && todayDinner ? data.todayYmd : data.displayDay
);

let selected = $state<{ meal: PublicMeal; date: DateParts } | null>(null);

function openMeal(day: MealDay) {
	const meal = mealFor(day, selectedMealType);
	const date = ymdParts(day.date);
	if (meal && date) selected = { meal, date };
}
</script>

<PageMeta
	title="급식 - {CLASS_LABEL}"
	description="정확한 급식을 한 눈에 확인하세요."
	path="/meals"
	robots="noindex"
/>

{#snippet infoGrid(title: string, rows: [string, string][], cols: string)}
	{#if rows.length > 0}
		<div class="mt-4 pt-4 border-t border-border">
			<p class="text-sm font-semibold text-muted-foreground mb-2">{title}</p>
			<div class="grid {cols} gap-x-4 gap-y-1.5">
				{#each rows as [name, value]}
					<div class="flex items-baseline justify-between gap-2 border-b border-border pb-1.5">
						<span class="text-xs text-muted-foreground truncate">{name}</span>
						<span class="text-xs text-foreground tabular-nums text-right">{value}</span>
					</div>
				{/each}
			</div>
		</div>
	{/if}
{/snippet}

<div class="max-w-4xl mx-auto px-4 pt-4 pb-2 sm:pt-5">
	<h1 class="sr-only">급식</h1>
	{#if mealsQuery.isLoading}
		<LoadingState />
	{:else if mealsQuery.error}
		<ErrorState error={mealsQuery.error} />
	{:else if availableMealTypes.length === 0}
		<EmptyState message="급식 정보가 없어요" />
	{:else}
		{#if availableMealTypes.length > 1}
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
		<HScroll blurred={blur.blurred} anchor="[data-display-day]" hint="좌우로 스크롤하세요">
			<!-- Sized against the scroll port in `cqw`: a % width under its `w-max`
			     wrapper would grow with the dish names. 37rem floor on phones. -->
			<div class="w-[max(100cqw,37rem)]">
				{#each weeks as days, w (w)}
					<FluidHeight key={selectedMealType}>
						<div class="mb-4 grid grid-cols-5 w-full divide-x divide-border border border-border rounded-xl overflow-hidden">
							{#each days as day (day.date)}
								{@const meal = mealFor(day, selectedMealType)}
								{@const highlighted = day.date === highlightDay}
								{@const dayLabel = relativeDayLabel(day.date, data.todayYmd)}
								<button
									type="button"
									onclick={() => openMeal(day)}
									disabled={!meal}
									data-display-day={highlighted ? '' : undefined}
									class={[
										'relative min-w-0 p-2.5 sm:px-3 sm:py-3 flex flex-col justify-between min-h-[15rem] text-left w-full transition-colors duration-150',
										highlighted ? 'bg-muted/60' : 'bg-card',
										meal ? 'cursor-pointer pointer:hover:bg-muted' : 'cursor-default'
									]}
								>
									<div class="min-w-0">
										<h2
											class="flex min-w-0 items-baseline gap-1.5 text-sm sm:text-base font-semibold {highlighted
												? 'text-foreground'
												: 'text-muted-foreground'}"
										>
											<span class="tabular-nums truncate">{shortDate(day.date)}</span>
											{#if dayLabel}
												<span
													class="shrink-0 text-xs font-semibold {dayLabel === '내일'
														? 'text-amber-700 dark:text-amber-400'
														: 'text-muted-foreground'}">{dayLabel}</span
												>
											{/if}
										</h2>
										{#if meal}
											<ul class="mt-2.5 min-w-0 space-y-1 text-foreground">
												{#each meal.dishes as dish}
													<li class="text-sm sm:text-list leading-snug truncate" title={dish}>{dish}</li>
												{/each}
											</ul>
										{:else}
											<p class="mt-2.5 text-sm text-muted-foreground/50" aria-hidden="true">—</p>
											<span class="sr-only">급식 없음</span>
										{/if}
									</div>
									<div class="mt-2 min-h-[1.25rem] flex items-end">
										{#if meal?.calories}
											<p class="text-xs sm:text-sm text-muted-foreground tabular-nums">{meal.calories}</p>
										{/if}
									</div>
								</button>
							{/each}
						</div>
					</FluidHeight>
				{/each}
			</div>
		</HScroll>
	{/if}
</div>

<Drawer open={selected !== null} onclose={() => (selected = null)}>
	{#snippet header()}
		{#if selected}
			<p class="text-sm font-semibold text-muted-foreground mb-1 tabular-nums">{selected.date.year}년</p>
			<div class="flex items-baseline gap-2 flex-wrap">
				<h2 class="text-2xl font-bold leading-tight text-foreground">
					{selected.date.month}월 {selected.date.day}일
				</h2>
				<span class="text-base text-muted-foreground leading-tight">{selected.date.weekday}요일</span>
				<span class="text-base font-semibold px-2.5 py-1 rounded-full bg-primary text-primary-foreground leading-tight">
					{selected.meal.mealType}
				</span>
			</div>
		{/if}
	{/snippet}

	{#if selected}
		<ul class="space-y-2">
			{#each selected.meal.dishes as dish}
				<li class="flex items-start gap-2.5 py-1">
					<span class="mt-2 w-1.5 h-1.5 rounded-full bg-muted-foreground/50 shrink-0"></span>
					<span class="text-base text-foreground leading-snug">{dish}</span>
				</li>
			{/each}
		</ul>

		{#if selected.meal.calories}
			<div class="mt-4 pt-4 border-t border-border flex items-center gap-2">
				<span class="text-sm font-semibold text-muted-foreground">열량</span>
				<span class="text-sm text-foreground tabular-nums">{selected.meal.calories}</span>
			</div>
		{/if}
		{@render infoGrid('영양', parseInfoRows(selected.meal.nutrients), 'grid-cols-2 sm:grid-cols-3')}
		{@render infoGrid('원산지', parseInfoRows(selected.meal.originInfo), 'grid-cols-1 sm:grid-cols-2')}
	{/if}
</Drawer>
