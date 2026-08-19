<script lang="ts">
	import '../app.css';
	import { getConvexUrl } from '$lib/convex';
	import { setupConvex } from 'convex-svelte';
	import { navigating, page } from '$app/state';
	import { onMount } from 'svelte';
	import { configure } from 'onedollarstats';
	import LoadingState from '$lib/components/ui/LoadingState.svelte';

	const { children } = $props();
	setupConvex(getConvexUrl());

	const navItems = [
		{ href: '/notices', label: '공지', match: (p: string) => p.startsWith('/notices') || p.startsWith('/notice/') },
		{ href: '/timetable', label: '시간표', match: (p: string) => p.startsWith('/timetable') },
		{ href: '/meals', label: '급식', match: (p: string) => p.startsWith('/meals') },
		{ href: '/calendar', label: '일정', match: (p: string) => p.startsWith('/calendar') }
	];

	const pendingNav = $derived.by(() => {
		const to = navigating.to?.url.pathname;
		const from = navigating.from?.url.pathname;
		return Boolean(to && to !== from);
	});

	// Keep the current page for a beat so a preloaded nav doesn't flash a spinner.
	let showPending = $state(false);
	$effect(() => {
		if (!pendingNav) {
			showPending = false;
			return;
		}
		const t = setTimeout(() => {
			showPending = true;
		}, 80);
		return () => clearTimeout(t);
	});

	onMount(() => {
		configure({
			collectorUrl: 'https://collector.onedollarstats.com/events',
			autocollect: true,
		});
	});
</script>
    <a href="#main" class="sr-only focus:not-sr-only focus:fixed focus:z-[1000] focus:top-2 focus:left-2 focus:bg-primary focus:text-primary-foreground focus:px-3 focus:py-2 focus:rounded-lg">본문으로 건너뛰기</a>

	<!-- Global Header -->
	<header class="sticky top-0 z-30 bg-background border-b border-border">
		<div class="max-w-4xl mx-auto flex items-center justify-between gap-3 px-4 h-14">
			<a href="/" class="shrink-0 pressable" aria-label="홈" data-sveltekit-preload-data="hover">
				<span class="text-xl font-bold tracking-tight text-foreground">TimeforSchool</span>
			</a>
			<nav class="flex items-center gap-1 sm:gap-2 text-list" data-sveltekit-preload-data="hover" data-sveltekit-preload-code="eager">
				{#each navItems as item (item.href)}
					{@const active = item.match(page.url.pathname)}
					<a
						href={item.href}
						class="rounded-md px-1.5 py-2 sm:px-2 font-semibold transition-colors duration-150
							{active
								? 'text-foreground'
								: 'text-muted-foreground pointer:hover:text-foreground'}"
						aria-current={active ? 'page' : undefined}
					>
						{item.label}
					</a>
				{/each}
			</nav>
		</div>
	</header>

	<main id="main">
		{#if showPending}
			<LoadingState fill />
		{:else}
			{@render children()}
		{/if}
	</main>

    <div aria-live="polite" aria-atomic="true" class="sr-only" id="aria-live-region"></div>
