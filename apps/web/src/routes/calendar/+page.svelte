<script lang="ts">
import { onMount } from 'svelte';
import { fade, fly } from 'svelte/transition';
import { useQuery, useConvexClient } from 'convex-svelte';
import { api } from "@class-info/backend/convex/_generated/api";
import type { PageData } from './$types.js';

let { data }: { data: PageData } = $props();
const client = useConvexClient();

function getNowInKst(): Date {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60_000;
  return new Date(utc + 9 * 60 * 60_000);
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function toYyyymmdd(year: number, month: number, day: number): string {
  return `${year}${pad2(month + 1)}${pad2(day)}`;
}

function formatDateDisplay(yyyymmdd: string): string {
  const y = Number(yyyymmdd.slice(0, 4));
  const m = Number(yyyymmdd.slice(4, 6));
  const d = Number(yyyymmdd.slice(6, 8));
  const date = new Date(y, m - 1, d);
  const weekday = date.toLocaleDateString('ko-KR', { weekday: 'short' });
  return `${m}월 ${d}일 (${weekday})`;
}

const nowKst = getNowInKst();
const todayStr = toYyyymmdd(nowKst.getFullYear(), nowKst.getMonth(), nowKst.getDate());

let displayYear = $state(data.year as number);
let displayMonth = $state(nowKst.getMonth()); // 0-11

// School events from Convex (real-time, reactive to year)
const schoolEventsQuery = useQuery(
  (api as any).schedule.getSchoolEventsByYear,
  () => ({ year: String(displayYear) }),
  () => ({ initialData: data.schoolEvents, keepPreviousData: true })
);

// Custom events from Convex (real-time)
const customEventsQuery = useQuery(
  (api as any).schedule.getCustomEventsByYear,
  () => ({ year: String(displayYear) }),
  () => ({ initialData: data.customEvents, keepPreviousData: true })
);

// Pagination bounds: Dec of last year → Feb of next year
const minYear = nowKst.getFullYear() - 1;
const minMonth = 11; // December
const maxYear = nowKst.getFullYear() + 1;
const maxMonth = 1; // February

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

// Calendar grid: returns weeks of {day, yyyymmdd} cells
function getCalendarWeeks(year: number, month: number) {
  const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: Array<{ day: number | null; yyyymmdd: string | null }> = [];

  for (let i = 0; i < firstDay; i++) {
    cells.push({ day: null, yyyymmdd: null });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, yyyymmdd: toYyyymmdd(year, month, d) });
  }
  while (cells.length % 7 !== 0) {
    cells.push({ day: null, yyyymmdd: null });
  }

  const weeks: (typeof cells)[] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }
  return weeks;
}

const calendarWeeks = $derived(getCalendarWeeks(displayYear, displayMonth));

// Group events by date
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

// Color helpers
function getSchoolEventClass(eventType: string): string {
  if (eventType === '공휴일') return 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300';
  if (eventType === '휴업일') return 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300';
  return 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300';
}

const CUSTOM_COLOR_CLASSES: Record<string, string> = {
  blue:   'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  green:  'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  purple: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  orange: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  pink:   'bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300',
  teal:   'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300',
};

const CUSTOM_COLORS = [
  { id: 'blue',   bgClass: 'bg-blue-500' },
  { id: 'green',  bgClass: 'bg-green-500' },
  { id: 'purple', bgClass: 'bg-purple-500' },
  { id: 'orange', bgClass: 'bg-orange-400' },
  { id: 'pink',   bgClass: 'bg-pink-400' },
  { id: 'teal',   bgClass: 'bg-teal-500' },
];

// Admin state
const isAuthenticated = data.isAuthenticated as boolean;
let addingToDate = $state<string | null>(null);
let newEventTitle = $state('');
let newEventColor = $state('blue');
let isSaving = $state(false);

function openAddForm(yyyymmdd: string) {
  addingToDate = yyyymmdd;
  newEventTitle = '';
  newEventColor = 'blue';
}

function closeAddForm() {
  addingToDate = null;
  newEventTitle = '';
}

async function handleAddEvent() {
  if (!newEventTitle.trim() || !addingToDate || isSaving) return;
  isSaving = true;
  try {
    await client.mutation((api as any).schedule.createCustomEvent, {
      date: addingToDate,
      title: newEventTitle.trim(),
      color: newEventColor,
    });
    closeAddForm();
  } catch {
    alert('저장 중 오류가 발생했습니다.');
  } finally {
    isSaving = false;
  }
}

async function handleDeleteCustomEvent(id: string) {
  if (!confirm('이 일정을 삭제하시겠습니까?')) return;
  try {
    await client.mutation((api as any).schedule.deleteCustomEvent, { id });
  } catch {
    alert('삭제 중 오류가 발생했습니다.');
  }
}

// Scroll gradients
let scrollContainer = $state<HTMLDivElement | undefined>();
let scrollLeft = $state(0);
let scrollRight = $state(0);

function updateGradients() {
  if (!scrollContainer) return;
  const { scrollLeft: left, scrollWidth, clientWidth } = scrollContainer;
  const hasOverflow = scrollWidth > clientWidth;
  scrollLeft = hasOverflow ? left : 0;
  scrollRight = hasOverflow ? scrollWidth - clientWidth - left : 0;
}

onMount(() => {
  updateGradients();
  const ro = new ResizeObserver(() => updateGradients());
  if (scrollContainer) ro.observe(scrollContainer);
  return () => ro.disconnect();
});

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

<div class="max-w-4xl mx-auto px-4 py-2">
  <!-- Month navigation -->
  <div class="flex items-center justify-between mb-3">
    <button
      onclick={() => navigate(-1)}
      disabled={!canNavigate(-1)}
      class="pressable w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 border border-neutral-200 dark:border-neutral-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-neutral-100 dark:disabled:hover:bg-neutral-800"
      aria-label="이전 달"
    >
      <svg viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4 sm:w-5 sm:h-5">
        <path fill-rule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clip-rule="evenodd"/>
      </svg>
    </button>

    <h2 class="text-base sm:text-lg font-semibold text-neutral-800 dark:text-neutral-200">
      {displayYear}년 {monthNames[displayMonth]}
    </h2>

    <button
      onclick={() => navigate(1)}
      disabled={!canNavigate(1)}
      class="pressable w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 border border-neutral-200 dark:border-neutral-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-neutral-100 dark:disabled:hover:bg-neutral-800"
      aria-label="다음 달"
    >
      <svg viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4 sm:w-5 sm:h-5">
        <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd"/>
      </svg>
    </button>
  </div>

  <!-- Calendar -->
  <div class="relative">
    <!-- Scroll gradients -->
    <div
      class="absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-white dark:from-neutral-900 to-transparent z-10 pointer-events-none transition-opacity duration-200"
      style="opacity: {scrollLeft > 0 ? 1 : 0};"
    ></div>
    <div
      class="absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-white dark:from-neutral-900 to-transparent z-10 pointer-events-none transition-opacity duration-200"
      style="opacity: {scrollRight > 0 ? 1 : 0};"
    ></div>

    <div
      class="overflow-x-auto"
      bind:this={scrollContainer}
      onscroll={updateGradients}
    >
      <div class="min-w-[40rem] border border-neutral-200 dark:border-neutral-700 rounded-lg overflow-hidden shadow-sm">

        <!-- Day name header -->
        <div class="grid grid-cols-7 bg-neutral-100 dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700">
          {#each dayNames as name, i}
            <div class="py-2 text-center text-sm font-medium
              {i === 0 ? 'text-red-500 dark:text-red-400' : i === 6 ? 'text-blue-500 dark:text-blue-400' : 'text-neutral-600 dark:text-neutral-300'}
              {i < 6 ? 'border-r border-neutral-200 dark:border-neutral-700' : ''}">
              {name}
            </div>
          {/each}
        </div>

        <!-- Week rows -->
        {#each calendarWeeks as week, wi}
          <div class="grid grid-cols-7 {wi < calendarWeeks.length - 1 ? 'border-b border-neutral-200 dark:border-neutral-700' : ''}">
            {#each week as cell, di}
              {@const isToday = cell.yyyymmdd === todayStr}
              {@const isPast = cell.yyyymmdd !== null && cell.yyyymmdd < todayStr}
              {@const isSun = di === 0}
              {@const isSat = di === 6}
              <div
                class="min-h-[5rem] sm:min-h-[7rem] p-1 sm:p-1.5 relative group
                  {di < 6 ? 'border-r border-neutral-200 dark:border-neutral-700' : ''}
                  {cell.day !== null && isSun ? 'bg-red-50/40 dark:bg-red-950/20' : ''}
                  {cell.day !== null && isSat ? 'bg-blue-50/40 dark:bg-blue-950/20' : ''}
                  {cell.day !== null && !isSun && !isSat ? 'bg-white dark:bg-neutral-900' : ''}
                  {cell.day === null ? 'bg-neutral-50 dark:bg-neutral-800/50' : ''}"
              >
                {#if cell.day !== null}
                  <!-- Date number row -->
                  <div class="flex items-center justify-between mb-0.5">
                    <span
                      class="text-base leading-none w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center flex-shrink-0
                        {isToday
                          ? 'rounded-full bg-neutral-800 dark:bg-neutral-200 text-white dark:text-neutral-900 font-bold'
                          : isSun
                            ? (isPast ? 'text-red-300 dark:text-red-800' : 'text-red-500 dark:text-red-400')
                            : isSat
                              ? (isPast ? 'text-blue-300 dark:text-blue-800' : 'text-blue-500 dark:text-blue-400')
                              : (isPast ? 'text-neutral-400 dark:text-neutral-600' : 'text-neutral-700 dark:text-neutral-300')}"
                    >{cell.day}</span>

                    <!-- Admin: add event button (always visible on mobile, hover on desktop) -->
                    {#if isAuthenticated}
                      <button
                        onclick={() => openAddForm(cell.yyyymmdd!)}
                        class="relative opacity-50 sm:opacity-0 sm:group-hover:opacity-100 w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center rounded text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-opacity flex-shrink-0 after:absolute after:top-1/2 after:left-1/2 after:-translate-x-1/2 after:-translate-y-1/2 after:w-8 after:h-8"
                        title="일정 추가"
                        aria-label="일정 추가"
                      >
                        <svg viewBox="0 0 16 16" fill="currentColor" class="w-2.5 h-2.5 sm:w-3 sm:h-3">
                          <path d="M8 2a1 1 0 011 1v4h4a1 1 0 010 2H9v4a1 1 0 01-2 0V9H3a1 1 0 010-2h4V3a1 1 0 011-1z"/>
                        </svg>
                      </button>
                    {/if}
                  </div>

                  <!-- School events -->
                  {#each (schoolEventsByDate[cell.yyyymmdd!] || []) as event}
                    <div
                      class="text-xs rounded px-1 py-0.5 mb-0.5 truncate leading-tight {getSchoolEventClass(event.eventType)}"
                      title={event.title}
                    >{event.title}</div>
                  {/each}

                  <!-- Custom events -->
                  {#each (customEventsByDate[cell.yyyymmdd!] || []) as event}
                    <div
                      class="text-xs rounded px-1 py-0.5 mb-0.5 leading-tight relative group/ev {CUSTOM_COLOR_CLASSES[event.color] ?? CUSTOM_COLOR_CLASSES.blue}"
                      title={event.title}
                    >
                      <span class="block truncate {isAuthenticated ? 'pr-3' : ''}">{event.title}</span>
                      {#if isAuthenticated}
                        <button
                          onclick={() => handleDeleteCustomEvent(event._id)}
                          class="absolute right-0 top-1/2 -translate-y-1/2 p-1 opacity-50 sm:opacity-0 sm:group-hover/ev:opacity-100 text-xs leading-none hover:text-red-600 dark:hover:text-red-400 transition-opacity"
                          title="삭제"
                          aria-label="삭제"
                        >×</button>
                      {/if}
                    </div>
                  {/each}
                {/if}
              </div>
            {/each}
          </div>
        {/each}

      </div>
    </div>
  </div>

  <!-- Legend -->
  <div class="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-neutral-500 dark:text-neutral-400">
    <span class="flex items-center gap-1">
      <span class="inline-block w-2.5 h-2.5 rounded-sm bg-red-200 dark:bg-red-900/60"></span>공휴일
    </span>
    <span class="flex items-center gap-1">
      <span class="inline-block w-2.5 h-2.5 rounded-sm bg-amber-200 dark:bg-amber-900/60"></span>휴업일
    </span>
    <span class="flex items-center gap-1">
      <span class="inline-block w-2.5 h-2.5 rounded-sm bg-sky-200 dark:bg-sky-900/60"></span>학교 행사
    </span>
  </div>

  <div class="block sm:hidden mt-1 text-center text-xs text-neutral-500 select-none pointer-events-none">
    좌우로 스크롤하세요 →
  </div>
</div>

<!-- Add event modal (admin) -->
{#if addingToDate}
  <div
    transition:fade={{duration: 150}}
    role="presentation"
    class="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
    onclick={closeAddForm}
    onkeydown={(e) => e.key === 'Escape' && closeAddForm()}
  >
    <div
      transition:fly={{y: 10, duration: 200, opacity: 0}}
      role="dialog"
      aria-modal="true"
      aria-labelledby="event-form-title"
      tabindex="-1"
      class="bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 p-5 w-full max-w-sm shadow-xl"
      onclick={(e) => e.stopPropagation()}
      onkeydown={(e) => e.stopPropagation()}
    >
      <h3 id="event-form-title" class="font-semibold text-neutral-800 dark:text-neutral-200 mb-3 text-base">
        일정 추가 — {formatDateDisplay(addingToDate)}
      </h3>

      <div class="mb-3">
        <label class="block text-sm text-neutral-600 dark:text-neutral-300 mb-1" for="event-title">제목</label>
        <input
          id="event-title"
          type="text"
          bind:value={newEventTitle}
          placeholder="일정 제목"
          class="w-full px-2 py-1.5 border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200 text-sm rounded"
          onkeydown={(e) => { if (e.key === 'Enter') handleAddEvent(); if (e.key === 'Escape') closeAddForm(); }}
        />
      </div>

      <fieldset class="mb-4 border-0 p-0 m-0">
        <legend class="block text-sm text-neutral-600 dark:text-neutral-300 mb-1.5">색상</legend>
        <div class="flex gap-2">
          {#each CUSTOM_COLORS as color}
            <button
              onclick={() => (newEventColor = color.id)}
              class="pressable w-6 h-6 rounded-full {color.bgClass} transition-[transform,box-shadow]
                {newEventColor === color.id ? 'ring-2 ring-offset-2 ring-neutral-500 dark:ring-neutral-400 scale-110' : ''}"
              title={color.id}
              aria-label={color.id}
              aria-pressed={newEventColor === color.id}
            ></button>
          {/each}
        </div>
      </fieldset>

      <div class="flex gap-2">
        <button
          onclick={handleAddEvent}
          disabled={isSaving || !newEventTitle.trim()}
          class="pressable flex-1 px-3 py-1.5 bg-neutral-800 dark:bg-neutral-200 text-white dark:text-neutral-900 text-sm font-medium rounded disabled:opacity-40 transition-opacity"
        >{isSaving ? '저장 중…' : '저장'}</button>
        <button
          onclick={closeAddForm}
          class="pressable px-3 py-1.5 border border-neutral-300 dark:border-neutral-600 text-sm text-neutral-700 dark:text-neutral-300 rounded hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
        >취소</button>
      </div>
    </div>
  </div>
{/if}
