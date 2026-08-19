<script lang="ts">
import { useQuery, useConvexClient } from 'convex-svelte';
import { api } from "@class-info/backend/convex/_generated/api";
import type { Id } from "@class-info/backend/convex/_generated/dataModel";
import Drawer from '../../components/Drawer.svelte';
import HScroll from '../../components/HScroll.svelte';
import { getNowInKst, toYyyymmdd } from '$lib/date';
import { focusOnElement } from '$lib/actions/focus';
import PillButton from '../../components/PillButton.svelte';
import { fade, fly, slide } from 'svelte/transition';
import { fadeFast, fadeIn, fadeOut, flyIn, slideY } from '$lib/transitions';
import type { PageData } from './$types.js';

const { data }: { data: PageData } = $props();
const client = useConvexClient();

function parseDateStr(yyyymmdd: string) {
  const y = Number(yyyymmdd.slice(0, 4));
  const m = Number(yyyymmdd.slice(4, 6));
  const d = Number(yyyymmdd.slice(6, 8));
  const date = new Date(y, m - 1, d);
  const weekday = date.toLocaleDateString('ko-KR', { weekday: 'short' });
  const isToday = yyyymmdd === todayStr;
  return { year: y, month: m, day: d, weekday, isToday };
}

const nowKst = getNowInKst();
const todayStr = toYyyymmdd(nowKst.getFullYear(), nowKst.getMonth(), nowKst.getDate());

let displayYear = $state(data.year as number);
let displayMonth = $state(nowKst.getMonth()); // 0-11

const schoolEventsQuery = useQuery(
  api.schedule.getSchoolEventsByYear,
  () => ({ year: String(displayYear) }),
  () => ({ initialData: data.schoolEvents, keepPreviousData: true })
);

const customEventsQuery = useQuery(
  api.schedule.getCustomEventsByYear,
  () => ({ year: String(displayYear) }),
  () => ({ initialData: data.customEvents, keepPreviousData: true })
);

// Pagination bounds: Dec of last year → Feb of next year
const minYear = nowKst.getFullYear() - 1;
const minMonth = 11;
const maxYear = nowKst.getFullYear() + 1;
const maxMonth = 1;

function canNavigate(direction: number): boolean {
  let m = displayMonth + direction;
  let y = displayYear;
  if (m < 0) { m = 11; y--; }
  else if (m > 11) { m = 0; y++; }
  return (y * 12 + m) >= (minYear * 12 + minMonth) && (y * 12 + m) <= (maxYear * 12 + maxMonth);
}

function navigate(direction: number) {
  if (!canNavigate(direction)) return;
  let newMonth = displayMonth + direction;
  let newYear = displayYear;
  if (newMonth < 0) { newMonth = 11; newYear--; }
  else if (newMonth > 11) { newMonth = 0; newYear++; }
  displayYear = newYear;
  displayMonth = newMonth;
}

// Six rows always: five-week and six-week months must occupy the same height,
// or paging between them moves everything below the grid.
const WEEK_ROWS = 6;

function getCalendarWeeks(year: number, month: number) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: Array<{ day: number | null; yyyymmdd: string | null }> = [];
  for (let i = 0; i < firstDay; i++) cells.push({ day: null, yyyymmdd: null });
  for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d, yyyymmdd: toYyyymmdd(year, month, d) });
  while (cells.length < WEEK_ROWS * 7) cells.push({ day: null, yyyymmdd: null });
  const weeks: (typeof cells)[] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

const calendarWeeks = $derived(getCalendarWeeks(displayYear, displayMonth));

const schoolEventsByDate = $derived(
  (schoolEventsQuery.data || []).reduce((acc: Record<string, any[]>, event: any) => {
    if (event.title === '토요휴업일') return acc;
    if (!acc[event.date]) acc[event.date] = [];
    acc[event.date].push(event);
    return acc;
  }, {} as Record<string, any[]>)
);

const customEventsByDate = $derived(
  (customEventsQuery.data || []).reduce((acc: Record<string, any[]>, event: any) => {
    if (!acc[event.date]) acc[event.date] = [];
    acc[event.date].push(event);
    return acc;
  }, {} as Record<string, any[]>)
);

// Color helpers — calendar cell chips
function getSchoolEventClass(eventType: string): string {
  if (eventType === '공휴일') return 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300';
  if (eventType === '휴업일' || eventType === '재량휴업일') return 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300';
  return 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300';
}

// Narrow cells can't carry a readable label, so they carry a dot in the same hue.
function getSchoolEventDot(eventType: string): string {
  if (eventType === '공휴일') return 'bg-red-500 dark:bg-red-400';
  if (eventType === '휴업일' || eventType === '재량휴업일') return 'bg-amber-500 dark:bg-amber-400';
  return 'bg-sky-500 dark:bg-sky-400';
}

const CUSTOM_COLOR_CLASSES: Record<string, string> = {
  blue:   'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  green:  'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  purple: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  orange: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  pink:   'bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300',
  teal:   'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300',
};

const CUSTOM_DOT_CLASSES: Record<string, string> = {
  blue:   'bg-blue-500 dark:bg-blue-400',
  green:  'bg-green-500 dark:bg-green-400',
  purple: 'bg-purple-500 dark:bg-purple-400',
  orange: 'bg-orange-500 dark:bg-orange-400',
  pink:   'bg-pink-500 dark:bg-pink-400',
  teal:   'bg-teal-500 dark:bg-teal-400',
};

const CUSTOM_COLORS = [
  { id: 'blue',   bgClass: 'bg-blue-500' },
  { id: 'green',  bgClass: 'bg-green-500' },
  { id: 'purple', bgClass: 'bg-purple-500' },
  { id: 'orange', bgClass: 'bg-orange-400' },
  { id: 'pink',   bgClass: 'bg-pink-400' },
  { id: 'teal',   bgClass: 'bg-teal-500' },
] as const;

type CustomEventColor = (typeof CUSTOM_COLORS)[number]['id'];

type CellEvent = { id: string; title: string; chipClass: string; dotClass: string };

function eventsForDate(dateStr: string | null): CellEvent[] {
  if (!dateStr) return [];
  const school = (schoolEventsByDate[dateStr] || []).map((e: any) => ({
    id: String(e._id),
    title: e.title,
    chipClass: getSchoolEventClass(e.eventType),
    dotClass: getSchoolEventDot(e.eventType),
  }));
  const custom = (customEventsByDate[dateStr] || []).map((e: any) => ({
    id: String(e._id),
    title: e.title,
    chipClass: CUSTOM_COLOR_CLASSES[e.color] ?? CUSTOM_COLOR_CLASSES.blue,
    dotClass: CUSTOM_DOT_CLASSES[e.color] ?? CUSTOM_DOT_CLASSES.blue,
  }));
  return [...school, ...custom];
}

// Color helpers — drawer event items
function getSchoolEventPopupStyle(eventType: string) {
  if (eventType === '공휴일') return { color: 'bg-red-400', bg: 'bg-red-50 dark:bg-red-400/10', label: '공휴일', labelColor: 'text-red-600 dark:text-red-400' };
  if (eventType === '휴업일' || eventType === '재량휴업일') return { color: 'bg-amber-400', bg: 'bg-amber-50 dark:bg-amber-400/10', label: eventType, labelColor: 'text-amber-700 dark:text-amber-400' };
  return { color: 'bg-sky-400', bg: 'bg-sky-50 dark:bg-sky-400/10', label: '학교 행사', labelColor: 'text-sky-700 dark:text-sky-400' };
}

const CUSTOM_POPUP_STYLE: Record<string, { color: string; bg: string; labelColor: string }> = {
  blue:   { color: 'bg-blue-400',   bg: 'bg-blue-50 dark:bg-blue-400/10',   labelColor: 'text-blue-600 dark:text-blue-400' },
  green:  { color: 'bg-green-400',  bg: 'bg-green-50 dark:bg-green-400/10',  labelColor: 'text-green-700 dark:text-green-400' },
  purple: { color: 'bg-purple-400', bg: 'bg-purple-50 dark:bg-purple-400/10', labelColor: 'text-purple-600 dark:text-purple-400' },
  orange: { color: 'bg-orange-400', bg: 'bg-orange-50 dark:bg-orange-400/10', labelColor: 'text-orange-700 dark:text-orange-400' },
  pink:   { color: 'bg-pink-400',   bg: 'bg-pink-50 dark:bg-pink-400/10',   labelColor: 'text-pink-600 dark:text-pink-400' },
  teal:   { color: 'bg-teal-400',   bg: 'bg-teal-50 dark:bg-teal-400/10',   labelColor: 'text-teal-700 dark:text-teal-400' },
};

// Admin state
const isAuthenticated = data.isAuthenticated as boolean;
const sessionToken = $derived((data.sessionToken as string | null) ?? '');
let newEventTitle = $state('');
let newEventColor = $state<CustomEventColor>('blue');
let isSaving = $state(false);
let saveError = $state<string | null>(null);

// ── Drawer state ─────────────────────────────────────────────────────────────

let selectedDate = $state<string | null>(null);
let popupAddMode = $state(false);

const selectedDateInfo = $derived(selectedDate ? parseDateStr(selectedDate) : null);
const selectedDateEvents = $derived({
  school: selectedDate ? (schoolEventsByDate[selectedDate] || []) : [],
  custom: selectedDate ? (customEventsByDate[selectedDate] || []) : [],
});

function openDayDrawer(yyyymmdd: string) {
  selectedDate = yyyymmdd;
  popupAddMode = false;
  saveError = null;
  newEventTitle = '';
  newEventColor = 'blue';
}

function openAddForm(yyyymmdd: string) {
  selectedDate = yyyymmdd;
  popupAddMode = true;
  saveError = null;
  newEventTitle = '';
  newEventColor = 'blue';
}

function onDrawerClose() {
  selectedDate = null;
  popupAddMode = false;
  newEventTitle = '';
  saveError = null;
}

async function handleAddEvent() {
  if (!newEventTitle.trim() || !selectedDate || isSaving) return;
  isSaving = true;
  saveError = null;
  try {
    await client.mutation(api.schedule.createCustomEvent, {
      sessionToken,
      date: selectedDate,
      title: newEventTitle.trim(),
      color: newEventColor,
    });
    newEventTitle = '';
    popupAddMode = false;
  } catch {
    saveError = '저장하지 못했어요. 잠시 후 다시 시도해 주세요.';
  } finally {
    isSaving = false;
  }
}

async function handleDeleteCustomEvent(id: string) {
  if (!confirm('이 일정을 삭제하시겠습니까? 되돌릴 수 없습니다.')) return;
  saveError = null;
  try {
    await client.mutation(api.schedule.deleteCustomEvent, { sessionToken, id: id as Id<'schedules'> });
  } catch {
    saveError = '삭제하지 못했어요. 잠시 후 다시 시도해 주세요.';
  }
}

const monthNames = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];
const dayNames = ['일','월','화','수','목','금','토'];
</script>

<svelte:head>
  <title>일정 - 1학년 3반</title>
  <meta name="description" content="학교 행사와 학사 일정을 한눈에 확인하세요." />
  <meta property="og:title" content="일정 - 1학년 3반" />
  <meta property="og:description" content="학교 행사와 학사 일정을 한눈에 확인하세요." />
  <meta property="og:url" content="https://timefor.school/calendar" />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="TimeforSchool" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="일정 - 1학년 3반" />
  <meta name="twitter:description" content="학교 행사와 학사 일정을 한눈에 확인하세요." />
  <meta name="robots" content="noindex" />
</svelte:head>

<div class="max-w-4xl mx-auto px-4 pt-4 pb-4">
  <!-- Month navigation -->
  <div class="flex items-center justify-between mb-4">
    <button
      onclick={() => navigate(-1)}
      disabled={!canNavigate(-1)}
      class="pressable touch-target w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-full bg-card text-muted-foreground border border-border transition-colors duration-150 enabled:pointer:hover:bg-muted enabled:pointer:hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
      aria-label="이전 달"
      data-s-event="Calendar Navigate"
      data-s-event-props="direction=prev"
    >
      <svg viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4 sm:w-5 sm:h-5">
        <path fill-rule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clip-rule="evenodd"/>
      </svg>
    </button>

    <h1 class="text-base sm:text-lg font-semibold text-foreground tabular-nums">
      {displayYear}년 {monthNames[displayMonth]}
    </h1>

    <button
      onclick={() => navigate(1)}
      disabled={!canNavigate(1)}
      class="pressable touch-target w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-full bg-card text-muted-foreground border border-border transition-colors duration-150 enabled:pointer:hover:bg-muted enabled:pointer:hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
      aria-label="다음 달"
      data-s-event="Calendar Navigate"
      data-s-event-props="direction=next"
    >
      <svg viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4 sm:w-5 sm:h-5">
        <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd"/>
      </svg>
    </button>
  </div>

  <!-- Calendar -->
  <HScroll>
      <div class="min-w-[40rem] border border-border rounded-xl overflow-hidden">

        <!-- Day name header -->
        <div class="grid grid-cols-7 bg-muted border-b border-border">
          {#each dayNames as name, i}
            <div class="py-2.5 text-center text-sm font-semibold
              {i === 0 ? 'text-red-600 dark:text-red-400' : i === 6 ? 'text-blue-600 dark:text-blue-400' : 'text-muted-foreground'}
              {i < 6 ? 'border-r border-border' : ''}">
              {name}
            </div>
          {/each}
        </div>

        <!-- Week rows -->
        {#each calendarWeeks as week, wi}
          <div class="grid grid-cols-7 {wi < calendarWeeks.length - 1 ? 'border-b border-border' : ''}">
            {#each week as cell, di}
              {@const isToday = cell.yyyymmdd === todayStr}
              {@const isPast = cell.yyyymmdd !== null && cell.yyyymmdd < todayStr}
              {@const isSun = di === 0}
              {@const isSat = di === 6}
              {@const cellEvents = eventsForDate(cell.yyyymmdd)}
              {@const hasEvents = cell.day !== null && cellEvents.length > 0}
              <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
              <div
                class="min-h-[5rem] sm:min-h-[7rem] p-1 sm:p-1.5 relative group
                  {hasEvents ? 'cursor-pointer transition-colors duration-150' : ''}
                  {di < 6 ? 'border-r border-border' : ''}
                  {cell.day !== null && isSun ? 'bg-red-50/50 dark:bg-red-950/20' : ''}
                  {hasEvents && isSun ? 'pointer:hover:bg-red-100/70 dark:pointer:hover:bg-red-950/40' : ''}
                  {cell.day !== null && isSat ? 'bg-blue-50/50 dark:bg-blue-950/20' : ''}
                  {hasEvents && isSat ? 'pointer:hover:bg-blue-100/70 dark:pointer:hover:bg-blue-950/40' : ''}
                  {cell.day !== null && !isSun && !isSat ? 'bg-card' : ''}
                  {hasEvents && !isSun && !isSat ? 'pointer:hover:bg-muted' : ''}
                  {cell.day === null ? 'bg-muted/40' : ''}"
                onclick={() => hasEvents && openDayDrawer(cell.yyyymmdd!)}
                role={hasEvents ? 'button' : undefined}
                tabindex={hasEvents ? 0 : undefined}
                onkeydown={(e) => { if (hasEvents && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); openDayDrawer(cell.yyyymmdd!); } }}
                aria-label={hasEvents ? `${displayYear}년 ${monthNames[displayMonth]} ${cell.day}일 일정 보기` : undefined}
              >
                {#if cell.day !== null}
                  <div class="flex items-center justify-between mb-0.5">
                    <span
                      class="text-sm sm:text-base w-7 h-7 sm:w-8 sm:h-8 inline-flex items-center justify-center flex-shrink-0 tabular-nums leading-none pt-px
                        {isToday
                          ? 'rounded-full bg-primary text-primary-foreground font-bold'
                          : isSun
                            ? (isPast ? 'text-red-400/70 dark:text-red-800' : 'text-red-600 dark:text-red-400')
                            : isSat
                              ? (isPast ? 'text-blue-400/70 dark:text-blue-800' : 'text-blue-600 dark:text-blue-400')
                              : (isPast ? 'text-muted-foreground/60' : 'text-foreground')}"
                    >{cell.day}</span>

                    {#if isAuthenticated}
                      <button
                        onclick={(e) => { e.stopPropagation(); openAddForm(cell.yyyymmdd!); }}
                        class="touch-target opacity-60 sm:opacity-0 sm:group-hover:opacity-100 w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center rounded text-muted-foreground pointer:hover:text-foreground pointer:hover:bg-muted transition-opacity duration-150 flex-shrink-0"
                        title="일정 추가"
                        aria-label="일정 추가"
                      >
                        <svg viewBox="0 0 16 16" fill="currentColor" class="w-2.5 h-2.5 sm:w-3 sm:h-3">
                          <path d="M8 2a1 1 0 011 1v4h4a1 1 0 010 2H9v4a1 1 0 01-2 0V9H3a1 1 0 010-2h4V3a1 1 0 011-1z"/>
                        </svg>
                      </button>
                    {/if}
                  </div>

                  {#each cellEvents as event (event.id)}
                    <div class="text-xs rounded px-1 py-0.5 mb-0.5 truncate leading-tight {event.chipClass}" title={event.title}>{event.title}</div>
                  {/each}
                {/if}
              </div>
            {/each}
          </div>
        {/each}

      </div>
  </HScroll>

  <!-- Legend -->
  <div class="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
    <span class="flex items-center gap-1.5"><span class="inline-block w-2.5 h-2.5 rounded-sm bg-red-200 dark:bg-red-900/60"></span>공휴일</span>
    <span class="flex items-center gap-1.5"><span class="inline-block w-2.5 h-2.5 rounded-sm bg-amber-200 dark:bg-amber-900/60"></span>휴업일</span>
    <span class="flex items-center gap-1.5"><span class="inline-block w-2.5 h-2.5 rounded-sm bg-sky-200 dark:bg-sky-900/60"></span>학교 행사</span>
  </div>

  <div class="block sm:hidden mt-1.5 text-center text-xs text-muted-foreground select-none pointer-events-none">
    좌우로 스크롤하세요 →
  </div>
</div>

{#snippet adminFooter()}
  {#if saveError}
    <p class="mb-3 text-sm font-semibold text-destructive" role="alert">{saveError}</p>
  {/if}

  {#if !popupAddMode}
    <div in:fly={flyIn} out:fade={fadeFast}>
      <PillButton variant="secondary" class="w-full" onclick={() => { popupAddMode = true; saveError = null; }}>
        <svg viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4 flex-shrink-0" aria-hidden="true">
          <path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd"/>
        </svg>
        일정 추가
      </PillButton>
    </div>
  {:else}
    <!-- The composer grows out of the button's place and shrinks back on cancel. -->
    <div transition:slide={slideY}>
    <div class="space-y-5 pt-1" in:fade={fadeIn} out:fade={fadeOut}>
      <!-- Title and colour are one thing — what the event is — so they sit
           tight together, with the action band set apart from them. -->
      <div class="space-y-3.5">
        <input
          type="text"
          bind:value={newEventTitle}
          use:focusOnElement={320}
          aria-label="일정 제목"
          placeholder="예: 반티 주문 마감"
          class="w-full h-11 px-3.5 rounded-lg bg-muted text-base text-foreground placeholder:text-muted-foreground"
          onkeydown={(e) => {
            if (e.key === 'Enter' && !e.isComposing) handleAddEvent();
            if (e.key === 'Escape') { popupAddMode = false; newEventTitle = ''; }
          }}
        />

        <div class="flex items-center gap-3">
          <span class="shrink-0 text-sm text-muted-foreground">색상</span>
          <!-- A check marks the choice. A ring would have read as focus, which
               is the one signal this row must not borrow. -->
          <div class="flex gap-2.5 touch:gap-4" role="radiogroup" aria-label="일정 색상">
            {#each CUSTOM_COLORS as color}
              <button
                type="button"
                onclick={() => (newEventColor = color.id)}
                class="pressable touch-target w-7 h-7 rounded-full flex items-center justify-center {color.bgClass}"
                role="radio"
                aria-checked={newEventColor === color.id}
                aria-label={color.id}
              >
                {#if newEventColor === color.id}
                  <svg viewBox="0 0 20 20" fill="none" stroke="white" stroke-width="3" class="w-4 h-4" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M5 10.5l3.5 3.5L15 7"/>
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
        <PillButton
          text="취소"
          variant="secondary"
          onclick={() => { popupAddMode = false; newEventTitle = ''; saveError = null; }}
        />
      </div>
    </div>
    </div>
  {/if}
{/snippet}

<!-- Day detail drawer -->
<Drawer
  open={selectedDate !== null}
  onclose={onDrawerClose}
  footer={isAuthenticated ? adminFooter : undefined}
>
  {#snippet header()}
    {#if selectedDateInfo}
      <p class="text-xs font-semibold text-muted-foreground mb-1 tabular-nums">
        {selectedDateInfo.year}년
      </p>
      <div class="flex items-baseline gap-2 flex-wrap">
        <h2 id="day-popup-title" class="text-2xl font-bold tracking-tight leading-tight text-foreground">
          {monthNames[selectedDateInfo.month - 1]} {selectedDateInfo.day}일
        </h2>
        <span class="text-base text-muted-foreground leading-tight">{selectedDateInfo.weekday}요일</span>
        {#if selectedDateInfo.isToday}
          <span class="text-base font-semibold px-2.5 py-1 rounded-full bg-primary text-primary-foreground leading-tight">오늘</span>
        {/if}
      </div>
    {/if}
  {/snippet}

  <!-- Events body -->
  {#if selectedDateEvents.school.length === 0 && selectedDateEvents.custom.length === 0}
    <div class="flex flex-col items-center justify-center py-10 text-center">
      <div class="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="w-6 h-6 text-muted-foreground">
          <path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"/>
        </svg>
      </div>
      <p class="text-base font-semibold text-muted-foreground">일정이 없어요</p>
      {#if isAuthenticated}
        <p class="text-sm text-muted-foreground/70 mt-1">아래 버튼으로 일정을 추가해 보세요</p>
      {/if}
    </div>
  {:else}
    <ul class="space-y-2.5">
      {#each selectedDateEvents.school as event (event._id)}
        {@const style = getSchoolEventPopupStyle(event.eventType)}
        <li class="flex rounded-lg overflow-hidden">
          <div class="w-1.5 flex-shrink-0 {style.color}"></div>
          <div class="flex-1 px-3 py-2.5 {style.bg}">
            <p class="text-sm font-semibold {style.labelColor} mb-0.5">{style.label}</p>
            <p class="text-base font-semibold text-foreground leading-snug">{event.title}</p>
          </div>
        </li>
      {/each}
      {#each selectedDateEvents.custom as event (event._id)}
        {@const style = CUSTOM_POPUP_STYLE[event.color] ?? CUSTOM_POPUP_STYLE.blue}
        <li class="flex rounded-lg overflow-hidden">
          <div class="w-1.5 flex-shrink-0 {style.color}"></div>
          <div class="flex-1 flex items-center justify-between gap-2 px-3 py-2.5 {style.bg}">
            <div class="min-w-0">
              <p class="text-sm font-semibold {style.labelColor} mb-0.5">학급 일정</p>
              <p class="text-base font-semibold text-foreground leading-snug">{event.title}</p>
            </div>
            {#if isAuthenticated}
              <button
                onclick={() => handleDeleteCustomEvent(event._id)}
                class="pressable-icon touch-target flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-full text-muted-foreground pointer:hover:text-destructive pointer:hover:bg-destructive/10 transition-colors duration-150"
                aria-label="삭제" title="삭제"
              >
                <svg viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4">
                  <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd"/>
                </svg>
              </button>
            {/if}
          </div>
        </li>
      {/each}
    </ul>
  {/if}

</Drawer>
