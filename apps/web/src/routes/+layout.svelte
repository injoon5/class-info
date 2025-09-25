<script lang="ts">
	import '../app.css';
    import { PUBLIC_CONVEX_URL } from '$env/static/public';
	import { setupConvex } from 'convex-svelte';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';

	const { children } = $props();
	
	// Set up Convex client
	setupConvex(PUBLIC_CONVEX_URL);
	
	// Ensure Convex is set up on mount for hard refreshes
	onMount(() => {
		setupConvex(PUBLIC_CONVEX_URL);
	});
</script>


<div class="min-h-screen bg-neutral-100 dark:bg-neutral-900 subpixel-antialiased break-keep">
	<!-- Global Header -->
	<div class="max-w-4xl mx-auto p-4 ios-content-padding w-full">
		<div class="flex justify-between items-center gap-2 pb-3 sm:pb-4 border-b border-neutral-300 dark:border-neutral-600">
			<h1 class="text-2xl sm:text-2xl font-bold text-neutral-800 dark:text-neutral-200 ios-text-optimized">3-4 학급 안내</h1>
			<nav class="flex items-center gap-3 sm:gap-4 text-neutral-700 dark:text-neutral-300">
				<a
					href="/"
					class="hover:underline {($page.url.pathname === '/' || $page.url.pathname.startsWith('/notice')) ? 'underline' : ''}"
					aria-current={($page.url.pathname === '/' || $page.url.pathname.startsWith('/notice')) ? 'page' : undefined}
				>
					공지사항
				</a>
				<a href="/timetable" class="hover:underline {($page.url.pathname.startsWith('/timetable')) ? 'underline' : ''}" aria-current={($page.url.pathname.startsWith('/timetable')) ? 'page' : undefined}>시간표</a>
			</nav>
			<!-- empty cell for grid alignment on desktop -->
			
		</div>
	</div>
	<main class="">
		{@render children()}
	</main>
	
</div>
