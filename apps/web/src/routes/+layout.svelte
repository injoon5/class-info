<script lang="ts">
	import '../app.css';
	import { getConvexUrl } from '$lib/convex';
	import { setupConvex } from 'convex-svelte';
	import { navigating, page } from '$app/state';
	import { onMount } from 'svelte';
	import { configure } from 'onedollarstats';
	import LoadingState from '$lib/components/ui/LoadingState.svelte';
	import { CLASS } from '$lib/site';

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
	const PENDING_DELAY_MS = 80;
	// …and once the spinner is up, keep it up. A 200ms navigation rendered
	// content → spinner → content, and a frame of spinner between two frames of
	// the real page reads as a glitch rather than as loading — it costs more
	// than the wait it saved.
	const PENDING_MIN_MS = 320;

	let showPending = $state(false);
	// Plain locals: the effect below decides what to do based on what is already
	// on screen, and reading the state it also writes would make it depend on
	// itself.
	let shown = false;
	let shownAt = 0;

	$effect(() => {
		if (pendingNav) {
			const t = setTimeout(() => {
				shown = true;
				shownAt = Date.now();
				showPending = true;
			}, PENDING_DELAY_MS);
			return () => clearTimeout(t);
		}

		if (!shown) return;

		const remaining = PENDING_MIN_MS - (Date.now() - shownAt);
		if (remaining <= 0) {
			shown = false;
			showPending = false;
			return;
		}
		const t = setTimeout(() => {
			shown = false;
			showPending = false;
		}, remaining);
		return () => clearTimeout(t);
	});

	onMount(() => {
		if (!CLASS.site.analytics) return;
		configure({
			collectorUrl: 'https://collector.onedollarstats.com/events',
			autocollect: true,
		});
	});

	// Press feedback scales the control down, and Chrome applies `:active` on
	// touchstart — before it knows whether the finger is pressing or starting
	// a scroll. Flag the scroll so app.css can stand the transform down.
	// Capturing, so nested scrollers (tables, the drawer body) count too.
	onMount(() => {
		const root = document.documentElement;
		let timer: ReturnType<typeof setTimeout> | null = null;

		const onScroll = () => {
			root.dataset.scrolling = '';
			if (timer) clearTimeout(timer);
			timer = setTimeout(() => {
				delete root.dataset.scrolling;
				timer = null;
			}, 120);
		};

		window.addEventListener('scroll', onScroll, { passive: true, capture: true });
		return () => {
			window.removeEventListener('scroll', onScroll, { capture: true });
			if (timer) clearTimeout(timer);
			delete root.dataset.scrolling;
		};
	});
</script>

<svelte:head>
	<meta name="apple-mobile-web-app-title" content={CLASS.site.name} />
</svelte:head>
    <a href="#main" class="sr-only focus:not-sr-only focus:fixed focus:z-[1000] focus:top-2 focus:left-2 focus:bg-primary focus:text-primary-foreground focus:px-3 focus:py-2 focus:rounded-lg">본문으로 건너뛰기</a>

	<!-- Global Header -->
	<header class="sticky top-0 z-30 bg-background border-b border-border">
		<div class="max-w-4xl mx-auto flex items-center justify-between gap-3 px-4 h-14">
			<a href="/" class="shrink-0 pressable" aria-label="홈" data-sveltekit-preload-data="hover">
				<span class="text-xl font-bold tracking-tight text-foreground">{CLASS.site.name}</span>
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
