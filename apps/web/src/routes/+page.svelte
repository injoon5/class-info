<script lang="ts">
import { useQuery } from 'convex-svelte';
import { api } from '@class-info/backend/convex/_generated/api';
import { CLASS_LABEL } from '@class-info/backend/convex/config';
import type { PublicEvent } from '@class-info/backend/convex/validators';
import PageMeta from '$lib/components/PageMeta.svelte';
import NoticeCard from '$lib/components/notices/NoticeCard.svelte';
import SectionHeader from '$lib/components/ui/SectionHeader.svelte';
import {
	addDaysYyyymmdd,
	ddayLabel,
	mondayYyyymmddOf,
	relativeDayLabel,
	shortDate,
	weekOffsetBetween,
	ymdParts,
	ymdWeekday
} from '$lib/date';
import { eventChrome } from '$lib/eventChrome';
import type { DayGroup, MinimalNotice } from '$lib/notices';
import { timetableForWeek } from '$lib/timetable';
import type { PageData } from './$types.js';

const { data }: { data: PageData } = $props();

const noticesQuery = useQuery(
	api.notices.currentGroups,
	() => ({ cutoff: data.cutoff, today: data.today }),
	() => ({ initialData: data.currentGroups, keepPreviousData: true })
);

// The display day is today until the 4pm rollover, then the next school day.
const displayDay = $derived(data.displayDay);
const todayYmd = $derived(data.todayYmd);
const display = $derived(ymdParts(displayDay));
const isTomorrow = $derived(displayDay === addDaysYyyymmdd(todayYmd, 1));

// ── Timetable ─────────────────────────────────────────────────────────────────
const displaySchedule = $derived.by(() => {
	if (!display) return [];
	const dayIndex = ymdWeekday(displayDay) - 1;
	if (dayIndex < 0 || dayIndex > 4) return [];
	const week = timetableForWeek(
		[data.timetable, data.nextWeekTimetable],
		mondayYyyymmddOf(displayDay),
		weekOffsetBetween(todayYmd, displayDay)
	);
	return week?.timetable[dayIndex] ?? [];
});

// ── Meals ─────────────────────────────────────────────────────────────────────
const mealDays = $derived([...(data.meals?.thisWeek?.days ?? []), ...(data.meals?.nextWeek?.days ?? [])]);
const mealsOn = (ymd: string) => mealDays.find((d) => d.date === ymd) ?? null;

// Between the rollover and dinner's end the page shows tomorrow, but tonight's
// 석식 hasn't been served yet, so it leads the card.
const pendingTodayDinner = $derived(
	displayDay !== todayYmd && !data.afterDinner ? (mealsOn(todayYmd)?.dinner ?? null) : null
);

// Two columns at most (a third is unreadable on a phone), in serving order.
const mealSlots = $derived.by(() => {
	const day = mealsOn(displayDay);
	return [
		...(pendingTodayDinner ? [{ key: 'today-dinner', type: '석식', day: todayYmd, meal: pendingTodayDinner }] : []),
		{ key: 'display-lunch', type: '중식', day: displayDay, meal: day?.lunch ?? null },
		...(day?.dinner ? [{ key: 'display-dinner', type: '석식', day: displayDay, meal: day.dinner }] : [])
	].slice(0, 2);
});

// ── Events ────────────────────────────────────────────────────────────────────
const events = $derived(
	(data.events ?? [])
		.filter((e) => e.title !== '토요휴업일')
		.sort((a, b) => a.date.localeCompare(b.date))
);
const displayDayEvents = $derived(events.filter((e) => e.date === displayDay));
// From today, not the display day, so today's events don't vanish at 4pm.
const upcomingEvents = $derived(events.filter((e) => e.date >= todayYmd));

function eventTypeLabel(event: PublicEvent): string {
	return event.source === 'custom' ? '' : (event.eventType ?? '');
}

// "오늘"/"내일" only where true; the display day can be days away.
function dayLabel(ymd: string): string {
	return relativeDayLabel(ymd, todayYmd) || shortDate(ymd);
}

// ── Notices ───────────────────────────────────────────────────────────────────
const PREVIEW_NOTICE_LIMIT = 4;
const currentGroups = $derived(noticesQuery.data ?? []);

// Earliest deadlines first, trimming the last group rather than dropping it.
const noticePreview = $derived.by(() => {
	const preview: DayGroup[] = [];
	let budget = PREVIEW_NOTICE_LIMIT;
	for (const group of currentGroups) {
		if (budget <= 0) break;
		const notices = group.notices.slice(0, budget);
		preview.push({ ...group, notices });
		budget -= notices.length;
	}
	return preview;
});

// The first notice past the cut, drawn fading out as the "there's more" hint.
const peekNotice = $derived<MinimalNotice | null>(
	currentGroups.flatMap((g) => g.notices)[PREVIEW_NOTICE_LIMIT] ?? null
);
</script>

<PageMeta
	title="오늘 - {CLASS_LABEL}"
	description="오늘의 시간표, 급식, 공지를 한눈에 확인하세요."
	path="/"
/>

<div class="max-w-4xl mx-auto px-4 pt-6 pb-16 sm:pt-8">
	<header class="mb-6 sm:mb-8">
		<div class="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1.5">
			<h1 class="flex flex-wrap items-baseline gap-x-2.5 sm:gap-x-3">
				{#if isTomorrow}
					<span class="text-2xl sm:text-3xl font-bold text-amber-700 dark:text-amber-400 whitespace-nowrap">내일</span>
				{/if}
				<span class="text-2xl sm:text-3xl font-bold text-foreground whitespace-nowrap">{display?.month}월 {display?.day}일</span>
				<span class="text-base sm:text-lg text-muted-foreground whitespace-nowrap">{display?.weekday}요일</span>
			</h1>
			{#if displayDayEvents.length > 0}
				<div class="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-base sm:text-lg">
					{#each displayDayEvents as event (event._id)}
						<span class="inline-flex items-baseline gap-1.5">
							<span class="font-semibold text-foreground">{event.title}</span>
							{#if eventTypeLabel(event)}
								<span class="text-sm font-semibold {eventChrome(event).labelColor}">{eventTypeLabel(event)}</span>
							{/if}
						</span>
					{/each}
				</div>
			{/if}
		</div>

		<!-- Counted from the real today, never the display day. -->
		{#if data.ddays.length > 0}
			<ul class="mt-3 flex flex-wrap items-baseline gap-x-4 gap-y-1">
				{#each data.ddays as event (event._id)}
					<li class="inline-flex items-baseline gap-1.5">
						<span class="text-sm font-bold {eventChrome(event).labelColor}">{ddayLabel(event.date, todayYmd)}</span>
						<span class="text-sm font-semibold text-foreground">{event.title}</span>
					</li>
				{/each}
			</ul>
		{/if}
	</header>

	<div class="grid grid-cols-1 sm:grid-cols-3 gap-5 sm:items-start mb-5 sm:mb-6">
		<section class="sm:col-span-1">
			<SectionHeader title="시간표" href="/timetable" />
			<div class="bg-card border border-border rounded-2xl p-4">
				{#if displaySchedule.length === 0}
					<p class="py-8 text-sm text-muted-foreground text-center">시간표가 없어요</p>
				{:else}
					<ol class="space-y-2.5">
						{#each displaySchedule as slot}
							<li class="flex items-center gap-3">
								<span class="text-sm tabular-nums text-muted-foreground shrink-0 w-4 text-center">{slot.period}</span>
								<span
									class="text-list font-semibold leading-snug truncate min-w-0 flex-1 {slot.replaced
										? 'text-amber-700 dark:text-amber-400'
										: 'text-foreground'}">{slot.subject}</span
								>
								{#if slot.teacher}
									<span class="text-sm text-muted-foreground shrink-0">{slot.teacher}</span>
								{/if}
							</li>
						{/each}
					</ol>
				{/if}
			</div>
		</section>

		<section class="sm:col-span-2">
			<SectionHeader title="급식" href="/meals" />
			<div class="bg-card border border-border rounded-2xl p-4">
				<div class="grid {mealSlots.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}">
					{#each mealSlots as slot, i (slot.key)}
						<!-- Equal padding either side of the divider keeps it centred. -->
						<div class={['flex flex-col', i > 0 && 'border-l border-border pl-4 sm:pl-6', i < mealSlots.length - 1 && 'pr-4 sm:pr-6']}>
							<p class="text-sm font-semibold text-muted-foreground mb-2">
								{#if pendingTodayDinner}
									<span class={slot.day === todayYmd ? '' : 'text-amber-700 dark:text-amber-400'}>{dayLabel(slot.day)}</span>
								{/if}
								{slot.type}
							</p>
							{#if !slot.meal}
								<p class="text-sm text-muted-foreground">급식 정보가 없어요</p>
							{:else}
								<ul class="space-y-1.5">
									{#each slot.meal.dishes as dish}
										<li class="text-list text-foreground leading-snug truncate">{dish}</li>
									{/each}
								</ul>
								{#if slot.meal.calories}
									<p class="mt-auto pt-2.5 text-sm text-muted-foreground tabular-nums">{slot.meal.calories}</p>
								{/if}
							{/if}
						</div>
					{/each}
				</div>
			</div>
		</section>
	</div>

	<div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
		<section>
			<SectionHeader title="공지" href="/notices" />
			{#if noticesQuery.isLoading && !noticesQuery.data}
				<div class="bg-card border border-border rounded-2xl px-4 py-8 text-center">
					<p class="text-sm text-muted-foreground">불러오는 중…</p>
				</div>
			{:else if currentGroups.length === 0}
				<div class="bg-card border border-border rounded-2xl px-4 py-8 text-center">
					<p class="text-sm text-muted-foreground">등록된 공지가 없어요</p>
				</div>
			{:else}
				<div class="space-y-4">
					{#each noticePreview as group (group.date)}
						<div>
							<p class="text-sm font-semibold text-muted-foreground mb-2">{group.displayDate}</p>
							<div class="grid gap-1.5">
								{#each group.notices as notice (notice._id)}
									<NoticeCard {notice} />
								{/each}
							</div>
						</div>
					{/each}

					{#if peekNotice}
						<!-- Decorative: the next notice dissolving into the page. -->
						<div class="relative -mt-2.5" aria-hidden="true" inert>
							<NoticeCard notice={peekNotice} interactive={false} />
							<div
								class="pointer-events-none absolute inset-0 bg-gradient-to-b from-background/0 via-background/75 via-55% to-background to-92%"
							></div>
						</div>
					{/if}
				</div>

				{#if peekNotice}
					<a
						href="/notices"
						class="block text-center text-sm font-semibold text-muted-foreground pt-3 pb-8 transition-colors duration-150 pointer:hover:text-foreground"
					>
						모두 보기 <span aria-hidden="true">→</span>
					</a>
				{/if}
			{/if}
		</section>

		<section>
			<SectionHeader title="일정" href="/calendar" />
			{#if upcomingEvents.length === 0}
				<div class="bg-card border border-border rounded-2xl px-4 py-8 text-center">
					<p class="text-sm text-muted-foreground">다가오는 일정이 없어요</p>
				</div>
			{:else}
				<ul class="bg-card border border-border rounded-2xl overflow-hidden divide-y divide-border">
					{#each upcomingEvents as event (event._id)}
						<li class="flex items-center gap-2.5 px-4 py-3">
							<span class="w-2 h-2 rounded-full shrink-0 {eventChrome(event).dot}" aria-hidden="true"></span>
							<span class="text-list text-foreground font-semibold flex-1 min-w-0 truncate">{event.title}</span>
							<span
								class="text-sm tabular-nums shrink-0 text-right {event.date === displayDay
									? 'font-semibold text-foreground'
									: 'text-muted-foreground'}"
							>
								{dayLabel(event.date)}
							</span>
						</li>
					{/each}
				</ul>
			{/if}
		</section>
	</div>
</div>
