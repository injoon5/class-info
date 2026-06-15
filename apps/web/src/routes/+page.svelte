<script lang="ts">
import type { PageData } from './$types.js';
import { Button } from '../components/ui';

let { data }: { data: PageData } = $props();

const school = $derived((data as any).school);
const classes = $derived((data as any).classes ?? []);

const features = [
	{ title: '시간표', desc: '학교 시간표를 자동으로 받아와 매일 갱신해요. 교체 수업도 한눈에.', icon: 'grid' },
	{ title: '급식', desc: '이번 주·다음 주 중식과 석식, 칼로리까지 깔끔하게 보여줘요.', icon: 'meal' },
	{ title: '학급 공지', desc: '수행평가·숙제·준비물을 마감일 기준으로 정리해요. 파일 첨부도 가능.', icon: 'bell' },
	{ title: '학사일정', desc: '공휴일·재량휴업일·학교 행사를 달력으로 확인하고 직접 추가하세요.', icon: 'calendar' }
];

const steps = [
	{ n: '1', title: '학교 검색', desc: '이름만 입력하면 전국 학교가 자동 완성돼요.' },
	{ n: '2', title: '학년·반 선택', desc: '실제 존재하는 학급을 골라 바로 연결해요.' },
	{ n: '3', title: '바로 시작', desc: '시간표·급식·일정이 자동으로 채워집니다.' }
];

// Sample data for the product preview card.
const previewPeriods = [
	{ p: 1, subject: '국어', teacher: '김선생' },
	{ p: 2, subject: '수학', teacher: '이선생', replaced: true },
	{ p: 3, subject: '영어', teacher: '박선생' },
	{ p: 4, subject: '과학', teacher: '최선생' }
];
const previewLunch = ['친환경백미밥', '소고기미역국', '제육볶음', '배추김치', '요구르트'];
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

	<!-- Hero -->
	<section class="relative overflow-hidden">
		<div class="pointer-events-none absolute inset-0 bg-gradient-to-b from-neutral-100/80 to-transparent dark:from-neutral-800/40"></div>
		<div class="relative max-w-4xl mx-auto px-4 pt-12 pb-10 sm:pt-20 sm:pb-14 text-center">
			<span class="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 dark:border-neutral-700 bg-white/70 dark:bg-neutral-800/70 px-3 py-1 text-xs font-medium text-neutral-600 dark:text-neutral-300">
				초·중·고 학급용 · 무료
			</span>
			<h1 class="mt-5 text-4xl sm:text-5xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100 leading-[1.12]">
				우리 반을 위한 모든 것,<br class="hidden sm:block" /> 한 곳에서.
			</h1>
			<p class="mt-4 text-base sm:text-lg text-neutral-600 dark:text-neutral-400 max-w-xl mx-auto">
				시간표·급식·학급 공지·학사일정을 자동으로 모아드려요. 학교만 검색하면 우리 반 페이지가 완성됩니다.
			</p>
			<div class="mt-7 flex items-center justify-center gap-3">
				<Button href="/register" class="px-5">학급 등록하기</Button>
				<Button href="#features" variant="secondary" class="px-5">기능 둘러보기</Button>
			</div>
			<p class="mt-3 text-xs text-neutral-400 dark:text-neutral-500">설치 없이 웹에서 바로 · 1분이면 충분해요</p>
		</div>
	</section>

	<!-- Product preview -->
	<section class="max-w-4xl mx-auto px-4">
		<div class="rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 shadow-xl shadow-neutral-200/50 dark:shadow-black/30 p-4 sm:p-6">
			<div class="flex items-center gap-1.5 mb-4">
				<span class="w-2.5 h-2.5 rounded-full bg-red-400"></span>
				<span class="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
				<span class="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
				<span class="ml-2 text-xs text-neutral-400 dark:text-neutral-500">우리학교.timefor.school/1/3</span>
			</div>
			<div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
				<!-- Timetable -->
				<div class="rounded-xl border border-neutral-200 dark:border-neutral-700 p-4">
					<p class="text-sm font-semibold text-neutral-500 dark:text-neutral-400 mb-3">오늘 시간표</p>
					<ol class="space-y-2">
						{#each previewPeriods as slot}
							<li class="flex items-center gap-2.5">
								<span class="text-sm tabular-nums text-neutral-400 w-4 text-center">{slot.p}</span>
								<span class="text-sm font-semibold {slot.replaced ? 'text-amber-500 dark:text-amber-400' : 'text-neutral-800 dark:text-neutral-200'}">{slot.subject}</span>
								<span class="ml-auto text-xs text-neutral-400">{slot.teacher}</span>
							</li>
						{/each}
					</ol>
				</div>
				<!-- Meal -->
				<div class="rounded-xl border border-neutral-200 dark:border-neutral-700 p-4">
					<p class="text-sm font-semibold text-neutral-500 dark:text-neutral-400 mb-3">오늘 급식</p>
					<ul class="space-y-1.5">
						{#each previewLunch as dish}
							<li class="text-sm text-neutral-700 dark:text-neutral-300">{dish}</li>
						{/each}
					</ul>
					<p class="mt-3 text-xs text-neutral-400">685.4 kcal</p>
				</div>
				<!-- Notices -->
				<div class="rounded-xl border border-neutral-200 dark:border-neutral-700 p-4">
					<p class="text-sm font-semibold text-neutral-500 dark:text-neutral-400 mb-3">공지</p>
					<div class="space-y-2">
						<div class="flex items-center gap-1.5">
							<span class="px-1.5 py-0.5 text-xs font-semibold rounded bg-neutral-700 text-white">수행평가</span>
							<span class="text-sm text-neutral-700 dark:text-neutral-300 truncate">수학 단원평가</span>
						</div>
						<div class="flex items-center gap-1.5">
							<span class="px-1.5 py-0.5 text-xs font-semibold rounded bg-neutral-500 text-white">준비물</span>
							<span class="text-sm text-neutral-700 dark:text-neutral-300 truncate">미술 색연필</span>
						</div>
						<div class="flex items-center gap-1.5">
							<span class="px-1.5 py-0.5 text-xs font-semibold rounded bg-neutral-500 text-white">숙제</span>
							<span class="text-sm text-neutral-700 dark:text-neutral-300 truncate">국어 독후감</span>
						</div>
					</div>
				</div>
			</div>
		</div>
	</section>

	<!-- Features -->
	<section id="features" class="max-w-4xl mx-auto px-4 pt-16 sm:pt-24 scroll-mt-20">
		<div class="text-center mb-10">
			<h2 class="text-2xl sm:text-3xl font-bold text-neutral-900 dark:text-neutral-100">필요한 기능만, 깔끔하게</h2>
			<p class="mt-2 text-neutral-500 dark:text-neutral-400">복잡한 설정 없이 학급 운영에 꼭 필요한 것들.</p>
		</div>
		<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
			{#each features as f}
				<div class="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 p-5 hover:border-neutral-400 dark:hover:border-neutral-500 transition-colors">
					<div class="w-10 h-10 rounded-lg bg-neutral-100 dark:bg-neutral-700 flex items-center justify-center text-neutral-700 dark:text-neutral-200 mb-3">
						{#if f.icon === 'grid'}
							<svg class="w-5 h-5" viewBox="0 0 20 20" fill="currentColor"><path d="M3 3h6v6H3V3zm8 0h6v6h-6V3zM3 11h6v6H3v-6zm8 0h6v6h-6v-6z"/></svg>
						{:else if f.icon === 'meal'}
							<svg class="w-5 h-5" viewBox="0 0 20 20" fill="currentColor"><path d="M3 2a1 1 0 011 1v5a2 2 0 002 2V3a1 1 0 112 0v7a4 4 0 01-3 3.87V17a1 1 0 11-2 0v-3.13A4 4 0 010 10V3a1 1 0 011-1zm13 0a3 3 0 013 3v5a3 3 0 01-2 2.83V17a1 1 0 11-2 0V3a1 1 0 011-1z"/></svg>
						{:else if f.icon === 'bell'}
							<svg class="w-5 h-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10 2a6 6 0 00-6 6v3.6l-1.3 2.6A1 1 0 003.6 16h12.8a1 1 0 00.9-1.4L16 11.6V8a6 6 0 00-6-6zM8 17a2 2 0 104 0H8z"/></svg>
						{:else}
							<svg class="w-5 h-5" viewBox="0 0 20 20" fill="currentColor"><path d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v9a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zM4 8h12v7H4V8z"/></svg>
						{/if}
					</div>
					<h3 class="text-base font-semibold text-neutral-800 dark:text-neutral-200">{f.title}</h3>
					<p class="mt-1 text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed">{f.desc}</p>
				</div>
			{/each}
		</div>
	</section>

	<!-- How it works -->
	<section class="max-w-4xl mx-auto px-4 pt-16 sm:pt-24">
		<div class="text-center mb-10">
			<h2 class="text-2xl sm:text-3xl font-bold text-neutral-900 dark:text-neutral-100">3단계면 끝</h2>
			<p class="mt-2 text-neutral-500 dark:text-neutral-400">학교를 검색하는 순간부터 자동으로 채워집니다.</p>
		</div>
		<div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
			{#each steps as s}
				<div class="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 p-5">
					<div class="w-8 h-8 rounded-full bg-neutral-800 dark:bg-neutral-200 text-white dark:text-neutral-900 flex items-center justify-center text-sm font-bold mb-3">{s.n}</div>
					<h3 class="text-base font-semibold text-neutral-800 dark:text-neutral-200">{s.title}</h3>
					<p class="mt-1 text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed">{s.desc}</p>
				</div>
			{/each}
		</div>
	</section>

	<!-- CTA band -->
	<section class="max-w-4xl mx-auto px-4 pt-16 sm:pt-24 pb-16">
		<div class="rounded-2xl bg-neutral-900 dark:bg-neutral-800 px-6 py-12 sm:py-16 text-center">
			<h2 class="text-2xl sm:text-3xl font-bold text-white">지금 우리 반 페이지를 만들어 보세요</h2>
			<p class="mt-3 text-neutral-300">가입 없이, 학교만 검색하면 바로 시작할 수 있어요.</p>
			<div class="mt-7">
				<Button href="/register" variant="secondary" class="px-6 bg-white text-neutral-900 border-transparent hover:bg-neutral-100">학급 등록하기 →</Button>
			</div>
		</div>
	</section>

	<!-- Footer -->
	<footer class="border-t border-neutral-200 dark:border-neutral-800">
		<div class="max-w-4xl mx-auto px-4 py-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-sm text-neutral-400 dark:text-neutral-500">
			<span>© {new Date().getFullYear()} TimeforSchool</span>
			<a href="/register" class="hover:text-neutral-700 dark:hover:text-neutral-300">학급 등록</a>
		</div>
	</footer>
{/if}
