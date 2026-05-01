<script lang="ts">
import { useQuery } from 'convex-svelte';
import { api } from "@class-info/backend/convex/_generated/api";
import NoticeCard from '../components/NoticeCard.svelte';
import type { PageData } from './$types.js';

let { data }: { data: PageData } = $props();

const noticesQuery = useQuery(api.notices.overview, {}, () => ({
	initialData: data.noticesOverview,
	keepPreviousData: true,
}));

// ── Date helpers ──────────────────────────────────────────────────────────────
function getNowInKst(): Date {
	const now = new Date();
	const utc = now.getTime() + now.getTimezoneOffset() * 60_000;
	return new Date(utc + 9 * 60 * 60_000);
}

function yyyymmdd(d: Date): string {
	return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
}

function getMondayTime(d: Date): number {
	const copy = new Date(d);
	const day = copy.getDay();
	copy.setDate(copy.getDate() - (day === 0 ? 6 : day - 1));
	copy.setHours(0, 0, 0, 0);
	return copy.getTime();
}

const WEEKDAYS_KR = ['일', '월', '화', '수', '목', '금', '토'];
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

// Which week's timetable to use
const displayIsNextWeek = getMondayTime(displayDay) > getMondayTime(kst);
const displayTimetableData = displayIsNextWeek ? data.nextWeekTimetable : data.timetable;
const displaySchedule = (displayTimetableData?.timetable?.[displayDayIndex] ?? []) as Array<{
	period: number; subject: string; teacher: string; replaced: boolean;
}>;

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
const upcomingEvents = $derived(
	[...(data.schoolEvents ?? []), ...(data.customEvents ?? [])]
		.filter((e: any) =>
			e.date >= todayYyyymmdd &&
			e.date <= in7days &&
			e.title !== '토요휴업일' &&
			e.eventType !== '해당없음'
		)
		.sort((a: any, b: any) => a.date.localeCompare(b.date))
);

// ── Notices ───────────────────────────────────────────────────────────────────
const noticePreview = $derived((noticesQuery.data?.currentGroups ?? []).slice(0, 3));
const hasNotices = $derived(noticePreview.length > 0);

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

<div class="max-w-4xl mx-auto px-4 pt-3 pb-12 sm:pt-5">

	<!-- ── Date banner ─────────────────────────────────────────────────────── -->
	<div class="mb-5 sm:mb-6">
		<div class="flex items-baseline gap-2.5">
			<h1 class="text-3xl sm:text-4xl font-bold text-neutral-900 dark:text-neutral-100" style="text-wrap: balance">
				{todayMonth}월 {todayDate}일
			</h1>
			<span class="text-xl sm:text-2xl font-medium text-neutral-400 dark:text-neutral-500">{todayWeekday}요일</span>
		</div>
	</div>

	<!-- ── Quick info: timetable (1) + meal (2) ───────────────────────────── -->
	<div class="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">

		<!-- Timetable -->
		<div class="sm:col-span-1">
			<div class="flex items-center justify-between mb-2.5">
				<h2 class="text-lg font-semibold text-neutral-600 dark:text-neutral-300">{cardDayLabel}시간표</h2>
				<a href="/timetable" class="text-sm text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors duration-100">모두 보기 →</a>
			</div>
			<div class="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-4">
				{#if displaySchedule.length === 0}
					<div class="flex items-center justify-center py-8">
						<p class="text-base text-neutral-800 dark:text-neutral-200 text-center">시간표 없음</p>
					</div>
				{:else}
					<ol class="space-y-2.5">
						{#each displaySchedule as slot}
							<li class="flex items-start gap-2.5">
								<span class="text-base tabular-nums text-neutral-400 dark:text-neutral-500 w-5 shrink-0 pt-0.5 leading-snug">{slot.period}</span>
								<span class="text-lg font-semibold leading-snug block truncate min-w-0 {slot.replaced ? 'text-amber-500 dark:text-amber-400' : 'text-neutral-800 dark:text-neutral-200'}">{slot.subject}</span>
							</li>
						{/each}
					</ol>
				{/if}
			</div>
		</div>

		<!-- Meal -->
		<div class="sm:col-span-2">
			<div class="flex items-center justify-between mb-2.5">
				<h2 class="text-lg font-semibold text-neutral-600 dark:text-neutral-300">{cardDayLabel}급식</h2>
				<a href="/meals" class="text-sm text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors duration-100">모두 보기 →</a>
			</div>
			<div class="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-4">
				<div class="grid grid-cols-2 gap-4">
					<!-- Lunch -->
					<div>
						<p class="text-base font-semibold text-neutral-400 dark:text-neutral-500 mb-2">중식</p>
						{#if !displayLunch}
							<p class="text-base text-neutral-800 dark:text-neutral-200">급식 정보가 없어요</p>
						{:else}
							<ul class="space-y-1.5">
								{#each displayLunch.dishes as dish}
									<li class="text-base text-neutral-700 dark:text-neutral-300 leading-snug">{dish}</li>
								{/each}
							</ul>
							{#if displayLunch.calories}
								<p class="mt-2 text-sm text-neutral-400 dark:text-neutral-500">{displayLunch.calories}</p>
							{/if}
						{/if}
					</div>
					<!-- Dinner -->
					<div>
						<p class="text-base font-semibold text-neutral-400 dark:text-neutral-500 mb-2">석식</p>
						{#if !displayDinner}
							<p class="text-base text-neutral-800 dark:text-neutral-200">급식 정보가 없어요</p>
						{:else}
							<ul class="space-y-1.5">
								{#each displayDinner.dishes as dish}
									<li class="text-base text-neutral-700 dark:text-neutral-300 leading-snug">{dish}</li>
								{/each}
							</ul>
							{#if displayDinner.calories}
								<p class="mt-2 text-sm text-neutral-400 dark:text-neutral-500">{displayDinner.calories}</p>
							{/if}
						{/if}
					</div>
				</div>
			</div>
		</div>

	</div>

	<!-- ── Notices + Events ────────────────────────────────────────────────── -->
	<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">

		<!-- Notices -->
		<div>
			<div class="flex items-center justify-between mb-2.5">
				<h2 class="text-lg font-semibold text-neutral-600 dark:text-neutral-300">공지</h2>
				<a href="/notices" class="text-sm text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors duration-100">모두 보기 →</a>
			</div>

			{#if noticesQuery.isLoading && !noticesQuery.data}
				<div class="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl px-4 py-6 text-center">
					<p class="text-base text-neutral-800 dark:text-neutral-200">불러오는 중…</p>
				</div>
			{:else if !hasNotices}
				<div class="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl px-4 py-6 text-center">
					<p class="text-base text-neutral-800 dark:text-neutral-200">공지가 없어요</p>
				</div>
			{:else}
				<div class="space-y-4">
					{#each noticePreview as group}
						<div>
							<p class="text-xs font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wide mb-2 pl-0.5">
								{group.displayDate}
							</p>
							<div class="grid gap-1.5">
								{#each group.notices as notice}
									<NoticeCard {notice} />
								{/each}
							</div>
						</div>
					{/each}

					{#if (noticesQuery.data?.currentGroups ?? []).length > 3}
						<a
							href="/notices"
							class="block text-center text-base text-neutral-400 dark:text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors duration-100 py-1"
						>
							+ {(noticesQuery.data?.currentGroups ?? []).length - 3}개 더 보기
						</a>
					{/if}
				</div>
			{/if}
		</div>

		<!-- Events -->
		<div>
			<div class="flex items-center justify-between mb-2.5">
				<h2 class="text-lg font-semibold text-neutral-600 dark:text-neutral-300">일정</h2>
				<a href="/calendar" class="text-sm text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors duration-100">모두 보기 →</a>
			</div>
			{#if upcomingEvents.length === 0}
				<div class="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl px-4 py-6 text-center">
					<p class="text-base text-neutral-800 dark:text-neutral-200">다가오는 일정이 없어요</p>
				</div>
			{:else}
				<div class="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl overflow-hidden">
					{#each upcomingEvents as event, i (event._id ?? i)}
						<div class="flex items-center gap-2 px-4 py-3 {i > 0 ? 'border-t border-neutral-100 dark:border-neutral-700' : ''}">
							<span class="text-base text-neutral-800 dark:text-neutral-200 font-medium flex-1 min-w-0 truncate">{event.title}</span>
							{#if eventTypeLabel(event)}
								<span class="text-sm font-medium shrink-0 {eventTypeCss(event)}">{eventTypeLabel(event)}</span>
							{/if}
							<span class="text-sm text-neutral-400 dark:text-neutral-500 shrink-0 text-right w-16">
								{isToday(event.date) ? '오늘' : formatEventDate(event.date)}
							</span>
						</div>
					{/each}
				</div>
			{/if}
		</div>

	</div>

</div>
