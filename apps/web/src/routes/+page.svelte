<script lang="ts">
import type { PageData } from './$types.js';
import { Button } from '../components/ui';

let { data }: { data: PageData } = $props();

const school = $derived((data as any).school);
const classes = $derived((data as any).classes ?? []);

const features = [
	{ title: '시간표', desc: '학교 시간표를 자동으로 받아와 매일 갱신해요.' },
	{ title: '급식', desc: '이번 주·다음 주 중식과 석식을 한눈에.' },
	{ title: '학급 공지', desc: '수행평가·숙제·준비물을 마감일 순으로 정리해요.' },
	{ title: '학사일정', desc: '공휴일과 학교 행사를 달력으로 확인해요.' }
];
</script>

<svelte:head>
	<title>{school ? school.schoolName : 'TimeforSchool — 우리 반을 위한 학급 페이지'}</title>
	<meta name="description" content="시간표, 급식, 학급 공지, 학사일정을 한 곳에서. 학교만 검색하면 우리 반 페이지가 완성됩니다." />
</svelte:head>

{#if school}
	<div class="max-w-4xl mx-auto px-4 pt-6 pb-12">
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
	</div>
{:else}
	<!-- ── Apex landing (no subdomain) ─────────────────────────────────────── -->
	<div class="max-w-3xl mx-auto px-4">
		<!-- Hero -->
		<section class="pt-16 pb-12 sm:pt-24 text-center">
			<h1 class="text-3xl sm:text-4xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100 leading-snug">
				우리 반을 위한 모든 것,<br class="hidden sm:block" /> 한 곳에서.
			</h1>
			<p class="mt-4 text-neutral-500 dark:text-neutral-400 max-w-md mx-auto">
				시간표·급식·공지·학사일정을 자동으로. 학교만 검색하면 우리 반 페이지가 완성됩니다.
			</p>
			<div class="mt-6">
				<Button href="/register" class="px-6">학급 등록하기</Button>
			</div>
		</section>

		<!-- Features -->
		<section class="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-16">
			{#each features as f}
				<div class="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 p-4">
					<h2 class="text-base font-semibold text-neutral-800 dark:text-neutral-200">{f.title}</h2>
					<p class="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{f.desc}</p>
				</div>
			{/each}
		</section>
	</div>
{/if}
