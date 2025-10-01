<script lang="ts">
	import '../app.css';
    import { PUBLIC_CONVEX_URL } from '$env/static/public';
	import { setupConvex } from 'convex-svelte';
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';

	const { children } = $props();
	setupConvex(PUBLIC_CONVEX_URL);
</script>
    <a href="#main" class="sr-only focus:not-sr-only focus:fixed focus:z-[1000] focus:top-2 focus:left-2 focus:bg-neutral-900 focus:text-white focus:px-3 focus:py-2 focus:rounded">Skip to content</a>
	<!-- Global Header -->
	<div class="max-w-4xl mx-auto px-4 pt-4 pb-2 sm:pb-3 w-full">
		<div class="flex justify-between items-center gap-2 pb-2 sm:pb-3 border-b-1 border-neutral-300 dark:border-neutral-600">
			<a class="text-2xl sm:text-2xl font-bold text-neutral-800 dark:text-neutral-200" href="/" >
				<h1>3-4 안내</h1>
			</a>
			<nav class="flex items-center gap-2 sm:gap-3 text-neutral-700 dark:text-neutral-300">
				<a
					href="/"
					class="hover:underline p-1 sm:px-2 sm:py-1 {(page.url.pathname === '/' || page.url.pathname.startsWith('/notice')) ? 'underline' : ''}"
					aria-current={(page.url.pathname === '/' || page.url.pathname.startsWith('/notice')) ? 'page' : undefined}
				>
					공지사항
				</a>
				<a href="/timetable" class="hover:underline p-1 sm:px-2 sm:py-1 {(page.url.pathname.startsWith('/timetable')) ? 'underline' : ''}" aria-current={(page.url.pathname.startsWith('/timetable')) ? 'page' : undefined}>시간표</a>
				<a href="/meals" class="hover:underline p-1 sm:px-2 sm:py-1 {(page.url.pathname.startsWith('/meals')) ? 'underline' : ''}" aria-current={(page.url.pathname.startsWith('/meals')) ? 'page' : undefined}>급식</a>
			</nav>

		</div>
	</div>
	<main id="main">
		{@render children()}
	</main>

    <div aria-live="polite" aria-atomic="true" class="sr-only" id="aria-live-region"></div>
	
