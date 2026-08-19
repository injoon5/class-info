<script lang="ts">
	import '../app.css';
	import { getConvexUrl } from '$lib/convex';
	import { setupConvex } from 'convex-svelte';
	import { navigating, page } from '$app/state';
	import { onMount } from 'svelte';
	import { configure } from 'onedollarstats';
	import LoadingState from '$lib/components/ui/LoadingState.svelte';
	import { thisMondayYyyymmdd } from '$lib/date';

	const { children } = $props();
	setupConvex(getConvexUrl());

	const navItems = [
		{ href: '/notices', label: '공지', match: (p: string) => p.startsWith('/notices') || p.startsWith('/notice/') },
		{ href: '/timetable', label: '시간표', match: (p: string) => p.startsWith('/timetable') },
		{ href: '/meals', label: '급식', match: (p: string) => p.startsWith('/meals') },
		{ href: '/calendar', label: '일정', match: (p: string) => p.startsWith('/calendar') }
	];

	const pendingKind = $derived.by(() => {
		const to = navigating.to?.url.pathname;
		const from = navigating.from?.url.pathname;
		if (!to || to === from) return null;
		if (to.startsWith('/timetable')) return 'timetable' as const;
		if (to.startsWith('/meals')) return 'meals' as const;
		if (to.startsWith('/calendar')) return 'calendar' as const;
		if (to.startsWith('/notices') || to.startsWith('/notice/')) return 'notices' as const;
		return 'spinner' as const;
	});

	// Keep the current page for a beat so a preloaded nav doesn't flash bones.
	let pendingSkeleton = $state<typeof pendingKind>(null);
	$effect(() => {
		const kind = pendingKind;
		if (!kind) {
			pendingSkeleton = null;
			return;
		}
		const t = setTimeout(() => {
			pendingSkeleton = kind;
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
		{#if pendingSkeleton === 'timetable'}
			<div class="max-w-4xl mx-auto px-4 pt-4 pb-1 sm:pt-5">
				<LoadingState variant="timetable" />
			</div>
		{:else if pendingSkeleton === 'meals'}
			<div class="max-w-4xl mx-auto px-4 pt-4 pb-2 sm:pt-5">
				<LoadingState variant="meals" weekStart={thisMondayYyyymmdd()} />
			</div>
		{:else if pendingSkeleton === 'calendar'}
			<div class="max-w-4xl mx-auto px-4 pt-4 pb-4">
				<LoadingState variant="calendar" />
			</div>
		{:else if pendingSkeleton === 'notices'}
			<div class="max-w-4xl mx-auto px-4 pt-5 pb-4 sm:pt-6">
				<LoadingState variant="notices" />
			</div>
		{:else if pendingSkeleton === 'spinner'}
			<LoadingState />
		{:else}
			{@render children()}
		{/if}
	</main>

    <div aria-live="polite" aria-atomic="true" class="sr-only" id="aria-live-region"></div>
	
