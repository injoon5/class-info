<script lang="ts">
import type { PageData } from './$types.js';

let { data }: { data: PageData } = $props();

const school = $derived((data as any).school);
const classes = $derived((data as any).classes ?? []);
</script>

<svelte:head>
	<title>{school ? school.schoolName : 'TimeforSchool'}</title>
	<meta name="description" content="우리 학교의 급식, 학사일정, 학급 공지를 한눈에." />
</svelte:head>

<div class="max-w-4xl mx-auto px-4 pt-6 pb-12">
	{#if school}
		<div class="mb-6">
			<h1 class="text-2xl sm:text-3xl font-bold text-neutral-900 dark:text-neutral-100">{school.schoolName}</h1>
			<p class="mt-1 text-neutral-500 dark:text-neutral-400">학급을 선택하거나 학교 급식·일정을 확인하세요.</p>
		</div>

		<!-- School-wide shortcuts -->
		<div class="grid grid-cols-2 gap-3 mb-8">
			<a href="/meals" class="block rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 p-4 hover:border-neutral-400 dark:hover:border-neutral-500 transition-colors">
				<h2 class="text-lg font-semibold text-neutral-800 dark:text-neutral-200">급식</h2>
				<p class="text-sm text-neutral-500 dark:text-neutral-400">이번 주 / 다음 주 급식</p>
			</a>
			<a href="/calendar" class="block rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 p-4 hover:border-neutral-400 dark:hover:border-neutral-500 transition-colors">
				<h2 class="text-lg font-semibold text-neutral-800 dark:text-neutral-200">일정</h2>
				<p class="text-sm text-neutral-500 dark:text-neutral-400">학사 일정 · 학교 행사</p>
			</a>
		</div>

		<!-- Class directory -->
		<h2 class="text-lg font-semibold text-neutral-600 dark:text-neutral-300 mb-3">학급</h2>
		{#if classes.length === 0}
			<div class="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-4 py-6 text-center">
				<p class="text-neutral-700 dark:text-neutral-300">등록된 학급이 없어요.</p>
				<a href="/register" class="inline-block mt-3 text-sm font-medium text-neutral-800 dark:text-neutral-200 underline">학급 등록하기 →</a>
			</div>
		{:else}
			<div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
				{#each classes as c}
					<a
						href={`/${c.grade}/${c.classNo}`}
						class="block rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 p-4 text-center hover:border-neutral-400 dark:hover:border-neutral-500 transition-colors"
					>
						<span class="text-lg font-semibold text-neutral-800 dark:text-neutral-200">{c.grade}학년 {c.classNo}반</span>
					</a>
				{/each}
			</div>
			<div class="mt-4 text-center">
				<a href="/register" class="text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 underline">+ 학급 등록</a>
			</div>
		{/if}
	{:else}
		<!-- Apex / unknown subdomain: marketing + registration entry -->
		<div class="max-w-xl mx-auto text-center py-16">
			<h1 class="text-3xl sm:text-4xl font-bold text-neutral-900 dark:text-neutral-100">TimeforSchool</h1>
			<p class="mt-3 text-neutral-600 dark:text-neutral-400">학급 시간표, 급식, 공지, 학사일정을 한 곳에서.</p>
			<a
				href="/register"
				class="inline-block mt-6 px-5 py-2.5 rounded-xl bg-neutral-800 dark:bg-neutral-200 text-white dark:text-neutral-900 text-sm font-semibold hover:bg-neutral-700 dark:hover:bg-neutral-100 transition-colors"
			>학급 등록하기</a>
		</div>
	{/if}
</div>
