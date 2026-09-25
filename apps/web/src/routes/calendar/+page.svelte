<script lang="ts">
import { useQuery, useConvexClient } from 'convex-svelte';
import { fade, slide } from 'svelte/transition';
import { api } from '@class-info/backend/convex/_generated/api';
import type { Id } from '@class-info/backend/convex/_generated/dataModel';
import { CLASS_LABEL } from '@class-info/backend/convex/config';
import type { PublicEvent } from '@class-info/backend/convex/validators';
import PageMeta from '$lib/components/PageMeta.svelte';
import Drawer from '$lib/components/ui/Drawer.svelte';
import HScroll from '$lib/components/ui/HScroll.svelte';
import PillButton from '$lib/components/ui/PillButton.svelte';
import Spinner from '$lib/components/ui/Spinner.svelte';
import { focusOnElement } from '$lib/actions/focus';
import { ddayLabel, getNowInKst, scheduleWindow, ymdFromParts, ymdParts } from '$lib/date';
import { blurActiveElement } from '$lib/dom';
import { adminErrorMessage } from '$lib/errors';
import {
	CUSTOM_COLOR_LABEL,
	CUSTOM_COLOR_SWATCH,
	CUSTOM_EVENT_COLORS,
	eventChrome,
	type CustomEventColor
} from '$lib/eventChrome';
import { fadeFast, fadeInAfter, fadeOut, reveal, slideYBoth } from '$lib/transitions';
import type { PageData } from './$types.js';

const { data }: { data: PageData } = $props();
const client = useConvexClient();

const todayStr = $derived(data.todayYmd);

// Months are counted as year * 12 + month (0-indexed) to page across years.
const nowKst = getNowInKst();
const range = scheduleWindow(nowKst);
const minIndex = range.startYear * 12 + range.startMonth;
const maxIndex = range.endYear * 12 + range.endMonth;

let monthIndex = $state(nowKst.getFullYear() * 12 + nowKst.getMonth());
const displayYear = $derived(Math.floor(monthIndex / 12));
const displayMonth = $derived(monthIndex % 12);

const eventsQuery = useQuery(
	api.schedule.getEventsInRange,
	() => ({ start: `${displayYear}0101`, end: `${displayYear}1231` }),
	() => ({
		...(data.events ? { initialData: data.events } : {}),
		keepPreviousData: true
	})
);
const eventsPending = $derived(eventsQuery.isLoading || eventsQuery.isStale);

// Six rows always, so paging between five- and six-week months doesn't move
// everything below the grid.
const WEEK_ROWS = 6;

const calendarWeeks = $derived.by(() => {
	const firstDay = new Date(displayYear, displayMonth, 1).getDay();
	const daysInMonth = new Date(displayYear, displayMonth + 1, 0).getDate();
	const cells: ({ day: number; ymd: string } | null)[] = Array.from({ length: WEEK_ROWS * 7 }, (_, i) => {
		const day = i - firstDay + 1;
		return day >= 1 && day <= daysInMonth ? { day, ymd: ymdFromParts(displayYear, displayMonth, day) } : null;
	});
	return Array.from({ length: WEEK_ROWS }, (_, w) => cells.slice(w * 7, w * 7 + 7));
});

// School events first, then custom ones, per date.
const eventsByDate = $derived.by(() => {
	const map: Record<string, PublicEvent[]> = {};
	const all = eventsQuery.data ?? [];
	for (const source of ['school', 'custom'] as const) {
		for (const event of all) {
			if (event.source !== source || event.title === '토요휴업일') continue;
			(map[event.date] ??= []).push(event);
		}
	}
	return map;
});

// A countdown only shows while its date is still ahead.
function countdown(event: PublicEvent): string {
	return event.dday && event.date >= todayStr ? ddayLabel(event.date, todayStr) : '';
}

function cellClass(ymd: string | null, column: number, hasEvents: boolean): string {
	if (!ymd) return 'bg-muted/40';
	const tone = column === 0 ? 'sun' : column === 6 ? 'sat' : 'day';
	const base = { sun: 'bg-red-50/50 dark:bg-red-950/20', sat: 'bg-blue-50/50 dark:bg-blue-950/20', day: 'bg-card' }[tone];
	if (!hasEvents) return base;
	const hover = {
		sun: 'pointer:hover:bg-red-100/70 dark:pointer:hover:bg-red-950/40',
		sat: 'pointer:hover:bg-blue-100/70 dark:pointer:hover:bg-blue-950/40',
		day: 'pointer:hover:bg-muted'
	}[tone];
	return `${base} ${hover} cursor-pointer transition-colors duration-150`;
}

function dayNumberClass(ymd: string, column: number): string {
	if (ymd === todayStr) return 'rounded-full bg-primary text-primary-foreground font-bold';
	const past = ymd < todayStr;
	if (column === 0) return past ? 'text-red-400/70 dark:text-red-800' : 'text-red-600 dark:text-red-400';
	if (column === 6) return past ? 'text-blue-400/70 dark:text-blue-800' : 'text-blue-600 dark:text-blue-400';
	return past ? 'text-muted-foreground/60' : 'text-foreground';
}

// ── Admin ────────────────────────────────────────────────────────────────────

const isAuthenticated = $derived(data.isAuthenticated);
const sessionToken = $derived(data.sessionToken ?? '');
let newEventTitle = $state('');
let newEventColor = $state<CustomEventColor>('blue');
let isSaving = $state(false);
let saveError = $state<string | null>(null);

// ── Day drawer ───────────────────────────────────────────────────────────────

let selectedDate = $state<string | null>(null);
let addMode = $state(false);

const selectedInfo = $derived(selectedDate ? ymdParts(selectedDate) : null);
const selectedEvents = $derived(selectedDate ? (eventsByDate[selectedDate] ?? []) : []);

function openDay(ymd: string, withForm = false) {
	selectedDate = ymd;
	addMode = withForm;
	saveError = null;
	newEventTitle = '';
	newEventColor = 'blue';
}

function closeForm() {
	blurActiveElement();
	addMode = false;
	newEventTitle = '';
	saveError = null;
}

async function handleAddEvent() {
	const title = newEventTitle.trim();
	if (!title || !selectedDate || isSaving) return;
	isSaving = true;
	saveError = null;
	try {
		await client.mutation(api.schedule.createCustomEvent, {
			sessionToken,
			date: selectedDate,
			title,
			color: newEventColor
		});
		closeForm();
	} catch (err) {
		saveError = adminErrorMessage(err, '저장하지 못했어요. 잠시 후 다시 시도해 주세요.');
	} finally {
		isSaving = false;
	}
}

async function handleToggleDday(event: PublicEvent) {
	saveError = null;
	try {
		await client.mutation(api.schedule.setEventDday, { sessionToken, id: event._id, dday: !event.dday });
	} catch (err) {
		saveError = adminErrorMessage(err, 'D-Day를 바꾸지 못했어요. 잠시 후 다시 시도해 주세요.');
	}
}

async function handleDeleteCustomEvent(id: Id<'schedules'>) {
	if (!confirm('이 일정을 삭제하시겠습니까? 되돌릴 수 없습니다.')) return;
	saveError = null;
	try {
		await client.mutation(api.schedule.deleteCustomEvent, { sessionToken, id });
	} catch (err) {
		saveError = adminErrorMessage(err, '삭제하지 못했어요. 잠시 후 다시 시도해 주세요.');
	}
}

const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
</script>

<PageMeta
	title="일정 - {CLASS_LABEL}"
	description="학교 행사와 학사 일정을 한눈에 확인하세요."
	path="/calendar"
	robots="noindex"
/>

{#snippet navButton(direction: -1 | 1)}
	{@const index = monthIndex + direction}
	<button
		onclick={() => (monthIndex = index)}
		disabled={index < minIndex || index > maxIndex}
		class="pressable touch-target w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-full bg-card text-muted-foreground border border-border transition-colors duration-150 enabled:pointer:hover:bg-muted enabled:pointer:hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
		aria-label={direction < 0 ? '이전 달' : '다음 달'}
		data-s-event="Calendar Navigate"
		data-s-event-props="direction={direction < 0 ? 'prev' : 'next'}"
	>
		<svg viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4 sm:w-5 sm:h-5 {direction > 0 ? 'rotate-180' : ''}" aria-hidden="true">
			<path
				fill-rule="evenodd"
				d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
				clip-rule="evenodd"
			/>
		</svg>
	</button>
{/snippet}

<div class="max-w-4xl mx-auto px-4 pt-4 pb-4">
	<div class="flex items-center justify-between mb-4">
		{@render navButton(-1)}
		<h1 class="relative whitespace-nowrap text-base sm:text-lg font-semibold text-foreground tabular-nums">
			{displayYear}년 {displayMonth + 1}월
			{#if eventsPending}
				<span class="absolute left-full top-1/2 ml-2.5 -translate-y-1/2 text-foreground">
					<Spinner size="sm" />
				</span>
			{/if}
		</h1>
		{@render navButton(1)}
	</div>

	<HScroll anchor="[data-today-cell]" hint="좌우로 스크롤하세요">
		<!-- A fixed width: under HScroll's `w-max` wrapper a min-width alone let
		     long event titles widen the grid month to month. -->
		<div class="w-[max(100cqw,40rem)] border border-border rounded-xl overflow-hidden" aria-busy={eventsPending}>
			{#if eventsPending}
				<span class="sr-only" role="status">일정을 불러오는 중</span>
			{/if}

			<div class="grid grid-cols-7 bg-muted border-b border-border">
				{#each dayNames as name, i (name)}
					<div
						class={[
							'py-2.5 text-center text-sm font-semibold',
							i === 0 ? 'text-red-600 dark:text-red-400' : i === 6 ? 'text-blue-600 dark:text-blue-400' : 'text-muted-foreground',
							i < 6 && 'border-r border-border'
						]}
					>
						{name}
					</div>
				{/each}
			</div>

			{#each calendarWeeks as week, wi (wi)}
				<div class={['grid grid-cols-7', wi < WEEK_ROWS - 1 && 'border-b border-border']}>
					{#each week as cell, di (di)}
						{@const cellEvents = cell && !eventsPending ? (eventsByDate[cell.ymd] ?? []) : []}
						{@const hasEvents = cellEvents.length > 0}
						<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
						<div
							data-today-cell={cell?.ymd === todayStr ? '' : undefined}
							class={[
								'min-w-0 min-h-[5rem] sm:min-h-[7rem] p-1 sm:p-1.5 relative group',
								di < 6 && 'border-r border-border',
								cellClass(cell?.ymd ?? null, di, hasEvents)
							]}
							onclick={() => cell && hasEvents && openDay(cell.ymd)}
							role={hasEvents ? 'button' : undefined}
							tabindex={hasEvents ? 0 : undefined}
							onkeydown={(e) => {
								if (cell && hasEvents && (e.key === 'Enter' || e.key === ' ')) {
									e.preventDefault();
									openDay(cell.ymd);
								}
							}}
							aria-label={cell && hasEvents ? `${displayYear}년 ${displayMonth + 1}월 ${cell.day}일 일정 보기` : undefined}
						>
							{#if cell}
								<div class="flex items-center justify-between mb-0.5">
									<span
										class="text-sm sm:text-base w-7 h-7 sm:w-8 sm:h-8 inline-flex items-center justify-center shrink-0 tabular-nums leading-none pt-px {dayNumberClass(cell.ymd, di)}"
									>
										{cell.day}
									</span>

									{#if isAuthenticated}
										<button
											onclick={(e) => {
												e.stopPropagation();
												openDay(cell.ymd, true);
											}}
											class="touch-target opacity-60 sm:opacity-0 sm:group-hover:opacity-100 focus-visible:opacity-100 w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center rounded text-muted-foreground pointer:hover:text-foreground pointer:hover:bg-muted transition-opacity duration-150 shrink-0"
											title="일정 추가"
											aria-label="{cell.day}일 일정 추가"
										>
											<svg viewBox="0 0 16 16" fill="currentColor" class="w-2.5 h-2.5 sm:w-3 sm:h-3" aria-hidden="true">
												<path d="M8 2a1 1 0 011 1v4h4a1 1 0 010 2H9v4a1 1 0 01-2 0V9H3a1 1 0 010-2h4V3a1 1 0 011-1z" />
											</svg>
										</button>
									{/if}
								</div>

								{#each cellEvents as event (event._id)}
									<!-- The countdown survives a title too long for the cell. -->
									<div
										class="flex items-baseline gap-1 text-xs rounded px-1 py-0.5 mb-0.5 leading-tight {eventChrome(event).chip}"
										title={event.title}
									>
										{#if countdown(event)}<span class="font-bold shrink-0">{countdown(event)}</span>{/if}
										<span class="min-w-0 truncate">{event.title}</span>
									</div>
								{/each}
							{/if}
						</div>
					{/each}
				</div>
			{/each}
		</div>
	</HScroll>

	<div class="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
		{#each [['bg-red-200 dark:bg-red-900/60', '공휴일'], ['bg-amber-200 dark:bg-amber-900/60', '휴업일'], ['bg-sky-200 dark:bg-sky-900/60', '학교 행사'], ['bg-blue-200 dark:bg-blue-900/60', '학급 일정']] as [swatch, label] (label)}
			<span class="flex items-center gap-1.5"><span class="inline-block w-2.5 h-2.5 rounded-sm {swatch}"></span>{label}</span>
		{/each}
	</div>
</div>

{#snippet adminFooter()}
	{#if saveError}
		<p class="mb-3 text-sm font-semibold text-destructive" role="alert">{saveError}</p>
	{/if}

	<!-- Both states share one grid cell; the button waits for the form to collapse. -->
	<div class="grid">
		{#if !addMode}
			<div class="col-start-1 row-start-1" in:fade={fadeInAfter} out:fade={fadeFast}>
				<PillButton
					variant="secondary"
					class="w-full"
					onclick={() => {
						addMode = true;
						saveError = null;
					}}
				>
					<svg viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4 shrink-0" aria-hidden="true">
						<path
							fill-rule="evenodd"
							d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
							clip-rule="evenodd"
						/>
					</svg>
					일정 추가
				</PillButton>
			</div>
		{:else}
			<!-- Height only here: a transform on this node froze the sheet on iOS
			     once the keyboard came up. The rise lives on the content inside. -->
			<div class="col-start-1 row-start-1" transition:slide={slideYBoth}>
				<div class="space-y-5 pt-1" in:reveal out:fade={fadeOut}>
					<div class="space-y-3.5">
						<input
							type="text"
							bind:value={newEventTitle}
							use:focusOnElement={320}
							aria-label="일정 제목"
							placeholder="예: 반티 주문 마감"
							class="field"
							onkeydown={(e) => {
								if (e.key === 'Enter' && !e.isComposing) handleAddEvent();
								if (e.key === 'Escape') {
									// Cancels the form without also closing the sheet.
									e.preventDefault();
									closeForm();
								}
							}}
						/>

						<div class="flex items-center gap-3">
							<span class="shrink-0 text-sm text-muted-foreground">색상</span>
							<div class="flex gap-2.5 touch:gap-4" role="radiogroup" aria-label="일정 색상">
								{#each CUSTOM_EVENT_COLORS as id (id)}
									<button
										type="button"
										onclick={() => (newEventColor = id)}
										class="pressable touch-target w-7 h-7 rounded-full flex items-center justify-center {CUSTOM_COLOR_SWATCH[id]}"
										role="radio"
										aria-checked={newEventColor === id}
										aria-label={CUSTOM_COLOR_LABEL[id]}
									>
										{#if newEventColor === id}
											<svg viewBox="0 0 20 20" fill="none" stroke="white" stroke-width="3" class="w-4 h-4" aria-hidden="true">
												<path stroke-linecap="round" stroke-linejoin="round" d="M5 10.5l3.5 3.5L15 7" />
											</svg>
										{/if}
									</button>
								{/each}
							</div>
						</div>
					</div>

					<div class="flex gap-2">
						<PillButton
							morph
							text={isSaving ? '저장 중…' : '저장'}
							pending={isSaving}
							onclick={handleAddEvent}
							disabled={isSaving || !newEventTitle.trim()}
							class="flex-1"
						/>
						<PillButton text="취소" variant="secondary" onclick={closeForm} />
					</div>
				</div>
			</div>
		{/if}
	</div>
{/snippet}

{#snippet eventRow(event: PublicEvent)}
	{@const chrome = eventChrome(event)}
	<li class="flex rounded-lg overflow-hidden">
		<div class="w-1.5 shrink-0 {chrome.popupBar}"></div>
		<div class="flex-1 flex items-center justify-between gap-3 px-3 py-2.5 {chrome.popupBg}">
			<div class="min-w-0">
				<p class="flex items-baseline gap-2 mb-0.5">
					<span class="text-sm font-semibold {chrome.labelColor}">{chrome.label}</span>
					{#if countdown(event)}
						<span class="text-sm font-bold text-foreground">{countdown(event)}</span>
					{/if}
				</p>
				<p class="text-base font-semibold text-foreground leading-snug">{event.title}</p>
			</div>
			{#if isAuthenticated}
				<div class="flex items-center gap-1 shrink-0">
					<button
						type="button"
						onclick={() => handleToggleDday(event)}
						aria-pressed={event.dday === true}
						title={event.dday ? 'D-Day 해제' : 'D-Day로 표시'}
						class="pressable touch-target px-2.5 py-1 rounded-full text-xs font-semibold transition-colors duration-150 {event.dday
							? 'bg-primary text-primary-foreground'
							: 'border border-border text-muted-foreground pointer:hover:text-foreground pointer:hover:bg-muted'}"
					>
						D-Day
					</button>
					{#if event.source === 'custom'}
						<button
							onclick={() => handleDeleteCustomEvent(event._id)}
							class="pressable-icon touch-target shrink-0 w-7 h-7 flex items-center justify-center rounded-full text-muted-foreground pointer:hover:text-destructive pointer:hover:bg-destructive/10 transition-colors duration-150"
							aria-label="삭제"
							title="삭제"
						>
							<svg viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4" aria-hidden="true">
								<path
									fill-rule="evenodd"
									d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
									clip-rule="evenodd"
								/>
							</svg>
						</button>
					{/if}
				</div>
			{/if}
		</div>
	</li>
{/snippet}

<Drawer
	open={selectedDate !== null}
	onclose={() => {
		selectedDate = null;
		addMode = false;
		newEventTitle = '';
		saveError = null;
	}}
	footer={isAuthenticated ? adminFooter : undefined}
>
	{#snippet header()}
		{#if selectedInfo}
			<p class="text-xs font-semibold text-muted-foreground mb-1 tabular-nums">{selectedInfo.year}년</p>
			<div class="flex items-baseline gap-2 flex-wrap">
				<h2 class="text-2xl font-bold leading-tight text-foreground">
					{selectedInfo.month}월 {selectedInfo.day}일
				</h2>
				<span class="text-base text-muted-foreground leading-tight">{selectedInfo.weekday}요일</span>
				{#if selectedDate === todayStr}
					<span class="text-base font-semibold px-2.5 py-1 rounded-full bg-primary text-primary-foreground leading-tight">오늘</span>
				{/if}
			</div>
		{/if}
	{/snippet}

	{#if selectedEvents.length === 0}
		<div class="flex flex-col items-center justify-center py-10 text-center">
			<p class="text-base font-semibold text-muted-foreground">일정이 없어요</p>
			{#if isAuthenticated}
				<p class="text-sm text-muted-foreground/70 mt-1">아래 버튼으로 일정을 추가해 보세요</p>
			{/if}
		</div>
	{:else}
		<ul class="space-y-2.5">
			{#each selectedEvents as event (event._id)}
				{@render eventRow(event)}
			{/each}
		</ul>
	{/if}
</Drawer>
