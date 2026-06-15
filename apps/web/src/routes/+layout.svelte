<script lang="ts">
	import '../app.css';
    import { PUBLIC_CONVEX_URL } from '$env/static/public';
	import { setupConvex } from 'convex-svelte';
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { configure } from 'onedollarstats';

	const { children, data } = $props();
	setupConvex(PUBLIC_CONVEX_URL);

	// Class context (if the current route is under /[grade]/[class]).
	const grade = $derived(page.params.grade);
	const classNo = $derived(page.params.class);
	const inClass = $derived(Boolean(grade && classNo));
	const base = $derived(inClass ? `/${grade}/${classNo}` : '');
	const schoolName = $derived((data as any)?.school?.schoolName ?? 'TimeforSchool');
	const hasSchool = $derived(Boolean((data as any)?.school));
	const homeHref = $derived(inClass ? base : '/');
	// Meals/calendar are school-global but also reachable within a class so the
	// user keeps the class context (and class nav) while browsing them.
	const mealsHref = $derived(inClass ? `${base}/meals` : '/meals');
	const calendarHref = $derived(inClass ? `${base}/calendar` : '/calendar');

	onMount(() => {
		configure({
			collectorUrl: 'https://collector.onedollarstats.com/events',
			autocollect: true,
		});
	});
</script>
    <a href="#main" class="sr-only focus:not-sr-only focus:fixed focus:z-[1000] focus:top-2 focus:left-2 focus:bg-neutral-900 focus:text-white focus:px-3 focus:py-2 focus:rounded">Skip to content</a>
	<!-- Global Header -->
	<div class="max-w-4xl mx-auto px-4 pt-4 pb-2 sm:pb-3 w-full">
		<div class="flex justify-between items-center gap-2 pb-2 sm:pb-3 border-b-1 border-neutral-300 dark:border-neutral-600">
			<a href={homeHref} class="group">
				<h1 class="text-xl font-bold text-neutral-800 dark:text-neutral-200 group-hover:text-neutral-600 dark:group-hover:text-neutral-300 transition-colors duration-100">{schoolName}{#if inClass}<span class="text-neutral-400 dark:text-neutral-500 font-medium"> {grade}-{classNo}</span>{/if}</h1>
			</a>
			<nav class="flex items-center gap-2 sm:gap-3 text-neutral-700 dark:text-neutral-300">
				{#if inClass}
					<a
						href="{base}/notices"
						class="hover:underline p-1 sm:px-2 sm:py-1 {(page.url.pathname.startsWith(`${base}/notices`) || page.url.pathname.startsWith(`${base}/notice/`)) ? 'underline' : ''}"
						aria-current={(page.url.pathname.startsWith(`${base}/notices`) || page.url.pathname.startsWith(`${base}/notice/`)) ? 'page' : undefined}
					>공지</a>
					<a href="{base}/timetable" class="hover:underline p-1 sm:px-2 sm:py-1 {(page.url.pathname.startsWith(`${base}/timetable`)) ? 'underline' : ''}" aria-current={(page.url.pathname.startsWith(`${base}/timetable`)) ? 'page' : undefined}>시간표</a>
				{/if}
				{#if hasSchool}
					<a href={mealsHref} class="hover:underline p-1 sm:px-2 sm:py-1 {(page.url.pathname.endsWith('/meals')) ? 'underline' : ''}" aria-current={(page.url.pathname.endsWith('/meals')) ? 'page' : undefined}>급식</a>
					<a href={calendarHref} class="hover:underline p-1 sm:px-2 sm:py-1 {(page.url.pathname.endsWith('/calendar')) ? 'underline' : ''}" aria-current={(page.url.pathname.endsWith('/calendar')) ? 'page' : undefined}>일정</a>
				{:else}
					<a href="/register" class="hover:underline p-1 sm:px-2 sm:py-1 {(page.url.pathname.startsWith('/register')) ? 'underline' : ''}" aria-current={(page.url.pathname.startsWith('/register')) ? 'page' : undefined}>등록</a>
				{/if}
			</nav>

		</div>
	</div>
	<main id="main">
		{@render children()}
	</main>

    <div aria-live="polite" aria-atomic="true" class="sr-only" id="aria-live-region"></div>
	
