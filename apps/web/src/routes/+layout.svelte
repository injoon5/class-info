<script lang="ts">
	import '../app.css';
    import { PUBLIC_CONVEX_URL } from '$env/static/public';
	import { setupConvex } from 'convex-svelte';
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { configure } from 'onedollarstats';

	const { children } = $props();
	setupConvex(PUBLIC_CONVEX_URL);

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
			<a href="/" class="group">
				<h1 class="text-xl font-bold text-neutral-800 dark:text-neutral-200 group-hover:text-neutral-600 dark:group-hover:text-neutral-300 transition-colors duration-100">TimeforSchool</h1>
			</a>
			<nav class="flex items-center gap-2 sm:gap-3 text-neutral-700 dark:text-neutral-300">
				<a
					href="/notices"
					class="hover:underline p-1 sm:px-2 sm:py-1 {(page.url.pathname.startsWith('/notices') || page.url.pathname.startsWith('/notice/')) ? 'underline' : ''}"
					aria-current={(page.url.pathname.startsWith('/notices') || page.url.pathname.startsWith('/notice/')) ? 'page' : undefined}
				>공지</a>
				<a href="/timetable" class="hover:underline p-1 sm:px-2 sm:py-1 {(page.url.pathname.startsWith('/timetable')) ? 'underline' : ''}" aria-current={(page.url.pathname.startsWith('/timetable')) ? 'page' : undefined}>시간표</a>
				<a href="/meals" class="hover:underline p-1 sm:px-2 sm:py-1 {(page.url.pathname.startsWith('/meals')) ? 'underline' : ''}" aria-current={(page.url.pathname.startsWith('/meals')) ? 'page' : undefined}>급식</a>
				<a href="/calendar" class="hover:underline p-1 sm:px-2 sm:py-1 {(page.url.pathname.startsWith('/calendar')) ? 'underline' : ''}" aria-current={(page.url.pathname.startsWith('/calendar')) ? 'page' : undefined}>일정</a>
			</nav>

		</div>
	</div>
	<main id="main">
		{@render children()}
	</main>

    <div aria-live="polite" aria-atomic="true" class="sr-only" id="aria-live-region"></div>
	
