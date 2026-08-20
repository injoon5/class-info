<script lang="ts">
import { useQuery } from 'convex-svelte';
import { api } from "@class-info/backend/convex/_generated/api";
import NoticeCard from '$lib/components/notices/NoticeCard.svelte';
import {
	addDaysYyyymmdd,
	parseYyyymmdd,
	weekdayKrUtc,
	ddayLabel,
	relativeDayLabel,
	weekOffsetBetween,
	ymdWeekday
} from '$lib/date';
import { eventChrome } from '$lib/eventChrome';
import type { DayGroup, MinimalNotice } from '$lib/notices';
import type { PublicEvent } from '@class-info/backend/convex/validators';
import PageMeta from '$lib/components/PageMeta.svelte';
import { pageTitle } from '$lib/site';
import type { PageData } from './$types.js';

const { data }: { data: PageData } = $props();

const noticesQuery = useQuery(
	api.notices.currentGroups,
	() => ({ cutoff: data.cutoff, today: data.today }),
	() => ({
		initialData: data.currentGroups,
		keepPreviousData: true,
	})
);

const displayDay = $derived(data.displayDay);
const todayYmd = $derived(data.todayYmd);
const isTomorrow = $derived(displayDay === addDaysYyyymmdd(todayYmd, 1));
const parsedDisplay = $derived(parseYyyymmdd(displayDay));
const displayMonth = $derived(parsedDisplay?.m ?? 0);
const displayDate = $derived(parsedDisplay?.d ?? 0);
const displayWeekday = $derived(
	parsedDisplay ? weekdayKrUtc(parsedDisplay.y, parsedDisplay.m, parsedDisplay.d) : ''
);
// ymdWeekday/weekOffsetBetween throw on a malformed date, so gate them on the
// same parse the labels above already degrade through.
const displayDayIndex = $derived(parsedDisplay ? ymdWeekday(displayDay) - 1 : -1); // 0=Mon…4=Fri

// Which week's timetable to use. We only hold this-week and next-week data, so
// map by whole-week offset; anything further out has no timetable to show.
const weekOffset = $derived(parsedDisplay ? weekOffsetBetween(todayYmd, displayDay) : -1);
const displayTimetableData = $derived(
	weekOffset === 0 ? data.timetable : weekOffset === 1 ? data.nextWeekTimetable : undefined
);
const displaySchedule = $derived(
	(displayDayIndex >= 0 && displayDayIndex <= 4
		? (displayTimetableData?.timetable?.[displayDayIndex] ?? [])
		: []) as Array<{ period: number; subject: string; teacher: string; replaced: boolean }>
);

const allMealDays = $derived([
	...(data.meals?.thisWeek?.days ?? []),
	...(data.meals?.nextWeek?.days ?? [])
]);
const displayMealDay = $derived(allMealDays.find((d) => d.date === displayDay) ?? null);
const displayLunch = $derived(displayMealDay?.lunch ?? null);
const displayDinner = $derived(displayMealDay?.dinner ?? null);

// Between the day-rollover hour and dinner-end (CLASS.hours) the page has
// moved on to tomorrow, but tonight's 석식 has not been served yet — so it
// leads the card, ahead of tomorrow's 중식. After dinner-end it drops out
// and only the display day's meals remain.
const todayMealDay = $derived(allMealDays.find((d) => d.date === todayYmd) ?? null);
const pendingTodayDinner = $derived(
	displayDay !== todayYmd && !data.afterDinner ? (todayMealDay?.dinner ?? null) : null
);

// Two columns is what this card is: a third makes every dish list too narrow
// to read on a phone, and stacking the three instead pushes the rest of the
// page below the fold. The slots are in serving order, so the two that survive
// are the two the reader eats next.
const mealSlots = $derived(
	[
		...(pendingTodayDinner
			? [{ key: 'today-dinner', type: '석식', day: todayYmd, meal: pendingTodayDinner }]
			: []),
		{ key: 'display-lunch', type: '중식', day: displayDay, meal: displayLunch },
		...(displayDinner
			? [{ key: 'display-dinner', type: '석식', day: displayDay, meal: displayDinner }]
			: [])
	].slice(0, 2)
);

// Only worth naming the day when the card straddles two of them.
const mealSpansDays = $derived(pendingTodayDinner !== null);
const mealGridClass = $derived(mealSlots.length === 1 ? 'grid-cols-1' : 'grid-cols-2');

// Symmetric padding either side of the divider keeps it on the exact half of
// the card's width.
function mealSlotClass(i: number, count: number): string {
	return [
		i > 0 ? 'border-l border-border pl-4 sm:pl-6' : '',
		i < count - 1 ? 'pr-4 sm:pr-6' : ''
	].join(' ');
}

const allEvents = $derived(
	[...(data.events ?? [])]
		.filter((e) => e.title !== '토요휴업일')
		.sort((a, b) => a.date.localeCompare(b.date))
);

const displayDayEvents = $derived(allEvents.filter((e) => e.date === displayDay));

// Countdowns an admin pinned, already filtered to today-onward and capped by
// the server. Counted from the real today, never the display day — a countdown
// that jumped a day at rollover would be wrong for the rest of the afternoon.
const ddayEvents = $derived(data.ddays ?? []);

// Spans from today, not from the display day: an event still happening today
// shouldn't vanish from the list at rollover just because the timetable moved on.
// The display day is emphasised within the list instead. The far end is the
// server's window (display day + a week), so there's nothing to re-bound here.
const upcomingEvents = $derived(allEvents.filter((e) => e.date >= todayYmd));

// ── Notices ───────────────────────────────────────────────────────────────────
const PREVIEW_NOTICE_LIMIT = 4;

const currentGroups = $derived(noticesQuery.data ?? []);
const hasNotices = $derived(currentGroups.length > 0);

// Take whole groups until the budget runs out, trimming the last group rather
// than dropping it — the earliest deadlines are the ones worth showing.
const noticePreview = $derived.by(() => {
	const preview: DayGroup[] = [];
	let budget = PREVIEW_NOTICE_LIMIT;
	for (const group of currentGroups) {
		if (budget <= 0) break;
		const notices = (group.notices ?? []).slice(0, budget);
		if (notices.length === 0) continue;
		preview.push({ ...group, notices });
		budget -= notices.length;
	}
	return preview;
});

// The first notice past the cut. It is what the fade is drawn over, so the
// "there is more" hint is the actual next notice rather than a decoy — and when
// this is null there is genuinely nothing more, and no hint is drawn at all.
const peekNotice = $derived.by((): MinimalNotice | null => {
	const shown = noticePreview.reduce((n, g) => n + (g.notices?.length ?? 0), 0);
	let i = 0;
	for (const group of currentGroups) {
		for (const notice of group.notices ?? []) {
			if (i++ === shown) return notice;
		}
	}
	return null;
});

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatEventDate(dateStr: string): string {
	const parsed = parseYyyymmdd(dateStr);
	if (!parsed) return dateStr;
	return `${parsed.m}/${parsed.d}(${weekdayKrUtc(parsed.y, parsed.m, parsed.d)})`;
}

function eventTypeLabel(event: PublicEvent): string {
	if (event.source === 'custom' || !event.eventType) return '';
	return event.eventType;
}

// Relative only where it is actually true. The display day can be several days
// out (a weekend, a holiday, a break), and calling that "오늘" is a lie.
function eventDateLabel(dateStr: string): string {
	return relativeDayLabel(dateStr, todayYmd) || formatEventDate(dateStr);
}

function isDisplayDayEvent(dateStr: string): boolean {
	return dateStr === displayDay;
}
</script>

<PageMeta
	title={pageTitle('오늘')}
	description="오늘의 시간표, 급식, 공지를 한눈에 확인하세요."
	path="/"
/>

<div class="max-w-4xl mx-auto px-4 pt-6 pb-16 sm:pt-8">

	<!-- ── Date hero ───────────────────────────────────────────────────────── -->
	<header class="mb-6 sm:mb-8">
		<div class="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1.5">
			<h1 class="flex flex-wrap items-baseline gap-x-2.5 sm:gap-x-3">
				{#if isTomorrow}
					<span class="text-2xl sm:text-3xl font-bold text-amber-700 dark:text-amber-400 whitespace-nowrap">내일</span>
				{/if}
				<span class="text-2xl sm:text-3xl font-bold text-foreground whitespace-nowrap">{displayMonth}월 {displayDate}일</span>
				<span class="text-base sm:text-lg text-muted-foreground whitespace-nowrap">{displayWeekday}요일</span>
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

		<!-- Countdowns sit under the date they are counted from. A neutral pill
		     with a coloured number: three of them in the event's own fill would
		     out-shout the date above, and the number is the part being read. -->
		{#if ddayEvents.length > 0}
			<ul class="mt-3 flex flex-wrap items-center gap-2">
				{#each ddayEvents as event (event._id)}
					<li class="inline-flex items-baseline gap-1.5 rounded-full border border-border bg-card py-1 pl-2.5 pr-3">
						<span class="text-sm font-bold {eventChrome(event).labelColor}">{ddayLabel(event.date, todayYmd)}</span>
						<span class="text-sm font-semibold text-foreground">{event.title}</span>
					</li>
				{/each}
			</ul>
		{/if}
	</header>

	<!-- Row 1: timetable (1/3) + meal (2/3) -->
	<div class="grid grid-cols-1 sm:grid-cols-3 gap-5 sm:items-start mb-5 sm:mb-6">

		<!-- Timetable -->
		<section class="sm:col-span-1">
			<div class="flex items-baseline justify-between mb-2.5">
				<h2 class="font-semibold text-muted-foreground">시간표</h2>
				<a href="/timetable" aria-label="시간표 모두 보기" class="text-sm font-semibold text-muted-foreground transition-colors duration-150 pointer:hover:text-foreground">모두 보기 <span aria-hidden="true">→</span></a>
			</div>
			<div class="bg-card border border-border rounded-2xl p-4">
				{#if displaySchedule.length === 0}
					<div class="flex items-center justify-center py-8">
						<p class="text-sm text-muted-foreground text-center">시간표가 없어요</p>
					</div>
				{:else}
					<ol class="space-y-2.5">
						{#each displaySchedule as slot}
							<li class="flex items-center gap-3">
								<span class="text-sm tabular-nums text-muted-foreground shrink-0 w-4 text-center">{slot.period}</span>
								<span class="text-list font-semibold leading-snug truncate min-w-0 flex-1 {slot.replaced ? 'text-amber-700 dark:text-amber-400' : 'text-foreground'}">{slot.subject}</span>
								{#if slot.teacher}
									<span class="text-sm text-muted-foreground shrink-0">{slot.teacher}</span>
								{/if}
							</li>
						{/each}
					</ol>
				{/if}
			</div>
		</section>

		<!-- Meal -->
		<section class="sm:col-span-2">
			<div class="flex items-baseline justify-between mb-2.5">
				<h2 class="font-semibold text-muted-foreground">급식</h2>
				<a href="/meals" aria-label="급식 모두 보기" class="text-sm font-semibold text-muted-foreground transition-colors duration-150 pointer:hover:text-foreground">모두 보기 <span aria-hidden="true">→</span></a>
			</div>
			<div class="bg-card border border-border rounded-2xl p-4">
				<!-- Meals in serving order. Tonight's 석식 leads until CLASS.hours.dinnerEnd. -->
				<div class="grid {mealGridClass}">
					{#each mealSlots as slot, i (slot.key)}
						<div class="flex flex-col {mealSlotClass(i, mealSlots.length)}">
							<p class="text-sm font-semibold text-muted-foreground mb-2">
								{#if mealSpansDays}
									<span class={slot.day === todayYmd ? '' : 'text-amber-700 dark:text-amber-400'}>{eventDateLabel(slot.day)}</span>
								{/if}
								{slot.type}
							</p>
							{#if !slot.meal}
								<p class="text-sm text-muted-foreground">급식 정보가 없어요</p>
							{:else}
								<ul class="space-y-1.5">
									{#each slot.meal.dishes as dish}
										<li class="text-list text-foreground leading-snug truncate max-w-full overflow-hidden whitespace-nowrap">{dish}</li>
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

	<!-- Row 2: notices + events, equal 1:1 with aligned tops -->
	<div class="grid grid-cols-1 sm:grid-cols-2 gap-5">

		<!-- Notices -->
		<section>
			<div class="flex items-baseline justify-between mb-2.5">
				<h2 class="font-semibold text-muted-foreground">공지</h2>
				<a href="/notices" aria-label="공지 모두 보기" class="text-sm font-semibold text-muted-foreground transition-colors duration-150 pointer:hover:text-foreground">모두 보기 <span aria-hidden="true">→</span></a>
			</div>

			{#if noticesQuery.isLoading && !noticesQuery.data}
				<div class="bg-card border border-border rounded-2xl px-4 py-8 text-center">
					<p class="text-sm text-muted-foreground">불러오는 중…</p>
				</div>
			{:else if !hasNotices}
				<div class="bg-card border border-border rounded-2xl px-4 py-8 text-center">
					<p class="text-sm text-muted-foreground">등록된 공지가 없어요</p>
				</div>
			{:else}
				<div class="space-y-4">
					{#each noticePreview as group (group.date)}
						<div>
							<p class="text-sm font-semibold text-muted-foreground mb-2">
								{group.displayDate}
							</p>
							<div class="grid gap-1.5">
								{#each group.notices as notice (notice._id)}
									<NoticeCard {notice} />
								{/each}
							</div>
						</div>
					{/each}

					{#if peekNotice}
						<!-- The list is shown continuing rather than described as
						     continuing: the next notice dissolves into the page instead
						     of being cut off, and the link sits in the space that opens
						     up before the next section. The card is decorative — not a
						     link, out of the a11y tree, out of the tab order. -->
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

		<!-- Events -->
		<section>
			<div class="flex items-baseline justify-between mb-2.5">
				<h2 class="font-semibold text-muted-foreground">일정</h2>
				<a href="/calendar" aria-label="일정 모두 보기" class="text-sm font-semibold text-muted-foreground transition-colors duration-150 pointer:hover:text-foreground">모두 보기 <span aria-hidden="true">→</span></a>
			</div>
			{#if upcomingEvents.length === 0}
				<div class="bg-card border border-border rounded-2xl px-4 py-8 text-center">
					<p class="text-sm text-muted-foreground">다가오는 일정이 없어요</p>
				</div>
			{:else}
				<div class="bg-card border border-border rounded-2xl overflow-hidden divide-y divide-border">
					{#each upcomingEvents as event, i (event._id ?? i)}
						<div class="flex items-center gap-2.5 px-4 py-3">
							<span class="w-2 h-2 rounded-full shrink-0 {eventChrome(event).dot}" aria-hidden="true"></span>
							<span class="text-list text-foreground font-semibold flex-1 min-w-0 truncate">{event.title}</span>
							<span class="text-sm tabular-nums shrink-0 text-right {isDisplayDayEvent(event.date) ? 'font-semibold text-foreground' : 'text-muted-foreground'}">
								{eventDateLabel(event.date)}
							</span>
						</div>
					{/each}
				</div>
			{/if}
		</section>

	</div>

</div>
