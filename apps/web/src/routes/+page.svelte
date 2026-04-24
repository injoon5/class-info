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

// ── Date helpers (client-side for accuracy) ───────────────────────────────────
function getNowInKst(): Date {
	const now = new Date();
	const utc = now.getTime() + now.getTimezoneOffset() * 60_000;
	return new Date(utc + 9 * 60 * 60_000);
}

function yyyymmdd(d: Date): string {
	return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
}

const kst = getNowInKst();
const todayYyyymmdd = yyyymmdd(kst);
const jsDay = kst.getDay(); // 0=Sun … 6=Sat
const todayDayIndex = jsDay >= 1 && jsDay <= 5 ? jsDay - 1 : -1;
const isWeekend = todayDayIndex === -1;

const WEEKDAYS_KR = ['일', '월', '화', '수', '목', '금', '토'];
const todayMonth = kst.getMonth() + 1;
const todayDate = kst.getDate();
const todayWeekday = WEEKDAYS_KR[jsDay];

// ── Derived from server data ──────────────────────────────────────────────────
const todaySchedule = $derived(
	(data.timetable?.timetable?.[todayDayIndex] ?? []) as Array<{
		period: number;
		subject: string;
		teacher: string;
		replaced: boolean;
	}>
);

const todayDay = $derived(
	(data.meals?.thisWeek?.days ?? []).find((d: any) => d.date === todayYyyymmdd) ?? null
);
const todayLunch = $derived(todayDay?.lunch ?? null);
const todayDinner = $derived(todayDay?.dinner ?? null);

// Upcoming events: today → +7 days, excluding 토요휴업일 clutter
const in7days = yyyymmdd(new Date(kst.getTime() + 7 * 24 * 60 * 60 * 1000));
const upcomingEvents = $derived(
	[...(data.schoolEvents ?? []), ...(data.customEvents ?? [])]
		.filter((e: any) =>
			e.date >= todayYyyymmdd &&
			e.date <= in7days &&
			e.title !== '토요휴업일'
		)
		.sort((a: any, b: any) => a.date.localeCompare(b.date))
);

// First 3 notice groups for the preview
const noticePreview = $derived(
	(noticesQuery.data?.currentGroups ?? []).slice(0, 3)
);
const hasNotices = $derived(noticePreview.length > 0);

function formatPeriodTime(periodNum: number): string {
	const times: string[] = data.timetable?.day_time ?? [];
	const label = times[periodNum - 1];
	return label ? label.replace(/^.*\(([^)]+)\)$/, '$1') : '';
}

function formatEventDate(dateStr: string): string {
	const y = Number(dateStr.slice(0, 4));
	const m = Number(dateStr.slice(4, 6));
	const d = Number(dateStr.slice(6, 8));
	const date = new Date(y, m - 1, d);
	return `${m}/${d}(${WEEKDAYS_KR[date.getDay()]})`;
}

function eventDotColor(event: any): string {
	if (event.source === 'custom' && event.color) return event.color;
	switch (event.eventType) {
		case '공휴일': return '#ef4444';
		case '휴업일': return '#f59e0b';
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

<div class="max-w-4xl mx-auto px-4 pt-3 pb-12 sm:pt-5">

	<!-- ── Date banner ─────────────────────────────────────────────────────── -->
	<div class="mb-5 sm:mb-6">
		<div class="flex items-baseline gap-2.5">
			<h1 class="text-3xl sm:text-4xl font-bold text-neutral-900 dark:text-neutral-100 tabular-nums" style="text-wrap: balance">
				{todayMonth}월 {todayDate}일
			</h1>
			<span class="text-xl sm:text-2xl font-medium text-neutral-400 dark:text-neutral-500">{todayWeekday}요일</span>
		</div>
	</div>

	<!-- ── Quick info: timetable + meal ───────────────────────────────────── -->
	<!-- 1-col on mobile, 4-col on sm+ (timetable=1, meal=3) -->
	<div class="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-6">

		<!-- Timetable: col-span-1 -->
		<div class="sm:col-span-1">
			<div class="flex items-center justify-between mb-2.5">
				<h2 class="text-lg font-semibold text-neutral-600 dark:text-neutral-300">시간표</h2>
				<a
					href="/timetable"
					class="text-sm text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors duration-100"
					aria-label="전체 시간표 보기"
				>전체 →</a>
			</div>
			<div class="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-4">
			{#if isWeekend || !data.timetable || todaySchedule.length === 0}
				<div class="flex items-center justify-center py-8">
					<p class="text-base text-neutral-800 dark:text-neutral-200 text-center">시간표 없음</p>
				</div>
			{:else}
				<ol class="space-y-2.5">
					{#each todaySchedule as slot}
						<li class="flex items-start gap-2.5">
							<span class="text-base tabular-nums text-neutral-400 dark:text-neutral-500 w-5 shrink-0 pt-0.5 leading-snug">{slot.period}</span>
							<span class="text-lg font-semibold leading-snug block truncate min-w-0 {slot.replaced ? 'text-amber-500 dark:text-amber-400' : 'text-neutral-800 dark:text-neutral-200'}">{slot.subject}</span>
						</li>
					{/each}
				</ol>
			{/if}
			</div>
		</div>

		<!-- Meal: col-span-3 -->
		<div class="sm:col-span-3">
			<div class="flex items-center justify-between mb-2.5">
				<h2 class="text-lg font-semibold text-neutral-600 dark:text-neutral-300">급식</h2>
				<a
					href="/meals"
					class="text-sm text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors duration-100"
					aria-label="전체 급식 보기"
				>전체 →</a>
			</div>
			<div class="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-4">
			<!-- Always show both columns, with empty state if no data -->
			<div class="grid grid-cols-2 gap-4">
				<!-- Lunch -->
				<div>
					<p class="text-base font-semibold text-neutral-400 dark:text-neutral-500 mb-2">중식</p>
					{#if !data.meals || !todayLunch}
						<p class="text-base text-neutral-800 dark:text-neutral-200">급식 정보가 없어요</p>
					{:else}
						<ul class="space-y-1.5">
							{#each todayLunch.dishes as dish}
								<li class="text-base text-neutral-700 dark:text-neutral-300 leading-snug">{dish}</li>
							{/each}
						</ul>
						{#if todayLunch.calories}
							<p class="mt-2 text-sm text-neutral-400 dark:text-neutral-500 tabular-nums">{todayLunch.calories}</p>
						{/if}
					{/if}
				</div>
				<!-- Dinner -->
				<div>
					<p class="text-base font-semibold text-neutral-400 dark:text-neutral-500 mb-2">석식</p>
					{#if !data.meals || !todayDinner}
						<p class="text-base text-neutral-800 dark:text-neutral-200">급식 정보가 없어요</p>
					{:else}
						<ul class="space-y-1.5">
							{#each todayDinner.dishes as dish}
								<li class="text-base text-neutral-700 dark:text-neutral-300 leading-snug">{dish}</li>
							{/each}
						</ul>
						{#if todayDinner.calories}
							<p class="mt-2 text-sm text-neutral-400 dark:text-neutral-500 tabular-nums">{todayDinner.calories}</p>
						{/if}
					{/if}
				</div>
			</div>
			</div>
		</div>

	</div>

	<!-- ── Notices + Events side by side ────────────────────────────────── -->
	<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">

		<!-- Notices -->
		<div>
			<div class="flex items-center justify-between mb-2.5">
				<h2 class="text-lg font-semibold text-neutral-600 dark:text-neutral-300">공지</h2>
				<a
					href="/notices"
					class="text-sm text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors duration-100"
				>모두 보기 →</a>
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
				<a
					href="/calendar"
					class="text-sm text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors duration-100"
				>달력 →</a>
			</div>
			{#if upcomingEvents.length === 0}
				<div class="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl px-4 py-6 text-center">
					<p class="text-base text-neutral-800 dark:text-neutral-200">다가오는 일정이 없어요</p>
				</div>
			{:else}
				<div class="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl overflow-hidden">
					{#each upcomingEvents as event, i (event._id ?? i)}
						<div class="flex items-center gap-3 px-4 py-3 {i > 0 ? 'border-t border-neutral-100 dark:border-neutral-700' : ''}">
							<span
								class="w-2 h-2 rounded-full shrink-0"
								style="background-color: {eventDotColor(event)}"
								aria-hidden="true"
							></span>
							<span class="text-base tabular-nums text-neutral-800 dark:text-neutral-200 w-16 shrink-0">
								{isToday(event.date) ? '오늘' : formatEventDate(event.date)}
							</span>
							<span class="text-base text-neutral-800 dark:text-neutral-200 font-medium flex-1 min-w-0 truncate text-right">{event.title}</span>
						</div>
					{/each}
				</div>
			{/if}
		</div>

	</div>

</div>
