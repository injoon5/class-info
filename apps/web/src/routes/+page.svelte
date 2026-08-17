<script lang="ts">
import { useQuery } from 'convex-svelte';
import { api } from "@class-info/backend/convex/_generated/api";
import NoticeCard from '../components/NoticeCard.svelte';
import { getNowInKst, yyyymmdd, WEEKDAYS_KR } from '$lib/date';
import type { PageData } from './$types.js';

let { data }: { data: PageData } = $props();

const noticesQuery = useQuery(api.notices.overview, {}, () => ({
	initialData: data.noticesOverview,
	keepPreviousData: true,
}));

// ── Date helpers ──────────────────────────────────────────────────────────────
function getMondayTime(d: Date): number {
	const copy = new Date(d);
	const day = copy.getDay();
	copy.setDate(copy.getDate() - (day === 0 ? 6 : day - 1));
	copy.setHours(0, 0, 0, 0);
	return copy.getTime();
}

const kst = getNowInKst();
const todayYyyymmdd = yyyymmdd(kst);
const todayMonth = kst.getMonth() + 1;
const todayDate = kst.getDate();
const todayWeekday = WEEKDAYS_KR[kst.getDay()];

// ── School-day logic ──────────────────────────────────────────────────────────
function isHoliday(dateStr: string): boolean {
	return (data.schoolEvents ?? []).some((e: any) =>
		e.date === dateStr &&
		(e.eventType === '공휴일' || e.eventType === '휴업일' || e.eventType === '재량휴업일')
	);
}

function isSchoolDay(d: Date): boolean {
	const day = d.getDay();
	return day >= 1 && day <= 5 && !isHoliday(yyyymmdd(d));
}

function findNextSchoolDay(): Date {
	const d = new Date(kst);
	for (let i = 0; i < 14; i++) {
		d.setDate(d.getDate() + 1);
		if (isSchoolDay(d)) return new Date(d);
	}
	return d;
}

// The day whose timetable + meal we display
const displayDay = isSchoolDay(kst) ? kst : findNextSchoolDay();
const displayDayStr = yyyymmdd(displayDay);
const displayDayIndex = displayDay.getDay() - 1; // 0=Mon…4=Fri

// Which week's timetable to use. We only hold this-week and next-week data, so
// map by whole-week offset; anything further out has no timetable to show.
const weekOffset = Math.round((getMondayTime(displayDay) - getMondayTime(kst)) / (7 * 24 * 60 * 60 * 1000));
const displayTimetableData =
	weekOffset === 0 ? data.timetable : weekOffset === 1 ? data.nextWeekTimetable : undefined;
const displaySchedule = (
	displayDayIndex >= 0 && displayDayIndex <= 4
		? (displayTimetableData?.timetable?.[displayDayIndex] ?? [])
		: []
) as Array<{ period: number; subject: string; teacher: string; replaced: boolean }>;

// Which meal day to show
const allMealDays = [...(data.meals?.thisWeek?.days ?? []), ...(data.meals?.nextWeek?.days ?? [])];
const displayMealDay = allMealDays.find((d: any) => d.date === displayDayStr) ?? null;
const displayLunch = displayMealDay?.lunch ?? null;
const displayDinner = displayMealDay?.dinner ?? null;

// Card title prefix: "" | "내일 " | "5월 3일 "
const tomorrowStr = yyyymmdd(new Date(kst.getTime() + 24 * 60 * 60 * 1000));
const displayWeekday = WEEKDAYS_KR[displayDay.getDay()];
const cardDayLabel = (() => {
	if (displayDayStr === todayYyyymmdd) return '';
	if (displayDayStr === tomorrowStr) return `내일 (${displayWeekday}) `;
	const m = Number(displayDayStr.slice(4, 6));
	const d = Number(displayDayStr.slice(6, 8));
	return `${m}월 ${d}일 (${displayWeekday}) `;
})();

// ── Events ────────────────────────────────────────────────────────────────────
const in7days = yyyymmdd(new Date(kst.getTime() + 7 * 24 * 60 * 60 * 1000));

const allEvents = $derived(
	[...(data.schoolEvents ?? []), ...(data.customEvents ?? [])]
		.filter((e: any) => e.title !== '토요휴업일')
		.sort((a: any, b: any) => a.date.localeCompare(b.date))
);

const todayEvents = $derived(allEvents.filter((e: any) => e.date === todayYyyymmdd));

const upcomingEvents = $derived(
	allEvents.filter((e: any) => e.date >= todayYyyymmdd && e.date <= in7days)
);

// ── Notices ───────────────────────────────────────────────────────────────────
const currentGroups = $derived(noticesQuery.data?.currentGroups ?? []);
const noticePreview = $derived(currentGroups.slice(0, 3));
const hasNotices = $derived(noticePreview.length > 0);
const shownNoticeCount = $derived(noticePreview.reduce((sum, g: any) => sum + (g.notices?.length ?? 0), 0));
const totalNoticeCount = $derived(currentGroups.reduce((sum, g: any) => sum + (g.notices?.length ?? 0), 0));
const remainingNoticeCount = $derived(totalNoticeCount - shownNoticeCount);

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatEventDate(dateStr: string): string {
	const y = Number(dateStr.slice(0, 4));
	const m = Number(dateStr.slice(4, 6));
	const d = Number(dateStr.slice(6, 8));
	const date = new Date(y, m - 1, d);
	return `${m}/${d}(${WEEKDAYS_KR[date.getDay()]})`;
}

function eventTypeLabel(event: any): string {
	if (event.source === 'custom' || !event.eventType) return '';
	return event.eventType;
}

function eventTypeCss(event: any): string {
	switch (event.eventType) {
		case '공휴일': return 'text-red-500 dark:text-red-400';
		case '휴업일':
		case '재량휴업일': return 'text-amber-500 dark:text-amber-400';
		default: return 'text-sky-500 dark:text-sky-400';
	}
}

function eventDotColor(event: any): string {
	if (event.source === 'custom' && event.color) return event.color;
	switch (event.eventType) {
		case '공휴일': return '#ef4444';
		case '휴업일':
		case '재량휴업일': return '#f59e0b';
		default: return '#0ea5e9';
	}
}

function isToday(dateStr: string): boolean {
	return dateStr === todayYyyymmdd;
}
</script>

<svelte:head>
	<title>오늘 - 1학년 3반</title>
	<meta name="description" content="오늘의 시간표, 급식, 공지를 한눈에 확인하세요." />
	<meta property="og:title" content="오늘 - 1학년 3반" />
	<meta property="og:description" content="오늘의 시간표, 급식, 공지를 한눈에 확인하세요." />
	<meta property="og:url" content="https://timefor.school" />
	<meta property="og:type" content="website" />
	<meta property="og:site_name" content="TimeforSchool" />
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content="오늘 - 1학년 3반" />
	<meta name="twitter:description" content="오늘의 시간표, 급식, 공지를 한눈에 확인하세요." />
</svelte:head>

<div class="max-w-4xl mx-auto px-4 pt-6 pb-16 sm:pt-8">

	<!-- ── Date hero ───────────────────────────────────────────────────────── -->
	<header class="flex flex-wrap items-end justify-between gap-x-6 gap-y-3 mb-7 sm:mb-9">
		<div>
			<p class="text-xs font-semibold tracking-wide text-muted-foreground mb-1.5">오늘</p>
			<h1 class="flex items-baseline gap-2.5">
				<span class="text-[2.5rem] sm:text-5xl font-bold tracking-tight leading-none text-foreground">{todayMonth}월 {todayDate}일</span>
				<span class="text-xl sm:text-2xl font-medium text-muted-foreground">{todayWeekday}요일</span>
			</h1>
		</div>
		{#if todayEvents.length > 0}
			<div class="flex flex-wrap items-center gap-1.5">
				{#each todayEvents as event}
					<span class="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground">
						<span class="w-1.5 h-1.5 rounded-full shrink-0" style="background-color: {eventDotColor(event)}" aria-hidden="true"></span>
						{event.title}
						{#if eventTypeLabel(event)}
							<span class="text-xs font-semibold {eventTypeCss(event)}">{eventTypeLabel(event)}</span>
						{/if}
					</span>
				{/each}
			</div>
		{/if}
	</header>

	<!-- ── Quick info: timetable (1) + meal (2) ───────────────────────────── -->
	<div class="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5 mb-4 sm:mb-5">

		<!-- Timetable -->
		<section class="sm:col-span-1">
			<div class="flex items-center justify-between mb-2.5 px-0.5">
				<h2 class="text-sm font-semibold text-muted-foreground">{cardDayLabel}시간표</h2>
				<a href="/timetable" class="text-xs font-medium text-muted-foreground transition-colors duration-100 pointer:hover:text-foreground">모두 보기 →</a>
			</div>
			<div class="bg-card border border-border rounded-2xl p-4 h-full">
				{#if displaySchedule.length === 0}
					<div class="flex items-center justify-center py-8">
						<p class="text-sm text-muted-foreground text-center">시간표 없음</p>
					</div>
				{:else}
					<ol class="space-y-2.5">
						{#each displaySchedule as slot}
							<li class="flex items-center gap-3">
								<span class="text-sm tabular-nums text-muted-foreground shrink-0 w-4 text-center">{slot.period}</span>
								<span class="text-[15px] font-semibold leading-snug truncate min-w-0 flex-1 {slot.replaced ? 'text-amber-600 dark:text-amber-400' : 'text-foreground'}">{slot.subject}</span>
								{#if slot.teacher}
									<span class="text-xs text-muted-foreground shrink-0">{slot.teacher}</span>
								{/if}
							</li>
						{/each}
					</ol>
				{/if}
			</div>
		</section>

		<!-- Meal -->
		<section class="sm:col-span-2">
			<div class="flex items-center justify-between mb-2.5 px-0.5">
				<h2 class="text-sm font-semibold text-muted-foreground">{cardDayLabel}급식</h2>
				<a href="/meals" class="text-xs font-medium text-muted-foreground transition-colors duration-100 pointer:hover:text-foreground">모두 보기 →</a>
			</div>
			<div class="bg-card border border-border rounded-2xl p-4 h-full">
				<div class="grid grid-cols-2 gap-4 sm:gap-6">
					<!-- Lunch -->
					<div>
						<p class="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">중식</p>
						{#if !displayLunch}
							<p class="text-sm text-muted-foreground">급식 정보가 없어요</p>
						{:else}
							<ul class="space-y-1.5">
								{#each displayLunch.dishes as dish}
									<li class="text-[15px] text-foreground leading-snug truncate max-w-full overflow-hidden whitespace-nowrap">{dish}</li>
								{/each}
							</ul>
							{#if displayLunch.calories}
								<p class="mt-2.5 text-xs text-muted-foreground">{displayLunch.calories}</p>
							{/if}
						{/if}
					</div>
					<!-- Dinner -->
					<div class="border-l border-border pl-4 sm:pl-6">
						<p class="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">석식</p>
						{#if !displayDinner}
							<p class="text-sm text-muted-foreground">급식 정보가 없어요</p>
						{:else}
							<ul class="space-y-1.5">
								{#each displayDinner.dishes as dish}
									<li class="text-[15px] text-foreground leading-snug truncate max-w-full overflow-hidden whitespace-nowrap">{dish}</li>
								{/each}
							</ul>
							{#if displayDinner.calories}
								<p class="mt-2.5 text-xs text-muted-foreground">{displayDinner.calories}</p>
							{/if}
						{/if}
					</div>
				</div>
			</div>
		</section>

	</div>

	<!-- ── Notices + Events ────────────────────────────────────────────────── -->
	<div class="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">

		<!-- Notices -->
		<section>
			<div class="flex items-center justify-between mb-2.5 px-0.5">
				<h2 class="text-sm font-semibold text-muted-foreground">공지</h2>
				<a href="/notices" class="text-xs font-medium text-muted-foreground transition-colors duration-100 pointer:hover:text-foreground">모두 보기 →</a>
			</div>

			{#if noticesQuery.isLoading && !noticesQuery.data}
				<div class="bg-card border border-border rounded-2xl px-4 py-8 text-center">
					<p class="text-sm text-muted-foreground">불러오는 중…</p>
				</div>
			{:else if !hasNotices}
				<div class="bg-card border border-border rounded-2xl px-4 py-8 text-center">
					<p class="text-sm text-muted-foreground">공지가 없어요</p>
				</div>
			{:else}
				<div class="space-y-4">
					{#each noticePreview as group}
						<div>
							<p class="text-xs font-semibold text-muted-foreground mb-2 pl-0.5">
								{group.displayDate}
							</p>
							<div class="grid gap-1.5">
								{#each group.notices as notice}
									<NoticeCard {notice} />
								{/each}
							</div>
						</div>
					{/each}

					{#if remainingNoticeCount > 0}
						<a
							href="/notices"
							class="block text-center text-sm text-muted-foreground transition-colors duration-100 pointer:hover:text-foreground py-1"
						>
							+ {remainingNoticeCount}개 더 보기
						</a>
					{/if}
				</div>
			{/if}
		</section>

		<!-- Events -->
		<section>
			<div class="flex items-center justify-between mb-2.5 px-0.5">
				<h2 class="text-sm font-semibold text-muted-foreground">일정</h2>
				<a href="/calendar" class="text-xs font-medium text-muted-foreground transition-colors duration-100 pointer:hover:text-foreground">모두 보기 →</a>
			</div>
			{#if upcomingEvents.length === 0}
				<div class="bg-card border border-border rounded-2xl px-4 py-8 text-center">
					<p class="text-sm text-muted-foreground">다가오는 일정이 없어요</p>
				</div>
			{:else}
				<div class="bg-card border border-border rounded-2xl overflow-hidden divide-y divide-border">
					{#each upcomingEvents as event, i (event._id ?? i)}
						<div class="flex items-center gap-2.5 px-4 py-3">
							<span class="w-2 h-2 rounded-full shrink-0" style="background-color: {eventDotColor(event)}" aria-hidden="true"></span>
							<span class="text-[15px] text-foreground font-medium flex-1 min-w-0 truncate">{event.title}</span>
							<span class="text-xs tabular-nums shrink-0 text-right {isToday(event.date) ? 'font-semibold text-foreground' : 'text-muted-foreground'}">
								{isToday(event.date) ? '오늘' : formatEventDate(event.date)}
							</span>
						</div>
					{/each}
				</div>
			{/if}
		</section>

	</div>

</div>
