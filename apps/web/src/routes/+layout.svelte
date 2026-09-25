<script lang="ts">
	import '../app.css';
	import { getConvexUrl } from '$lib/convex';
	import { setupConvex } from 'convex-svelte';
	import { navigating, page } from '$app/state';
	import { onMount } from 'svelte';
	import { configure } from 'onedollarstats';
	import LoadingState from '$lib/components/ui/LoadingState.svelte';
	import { SITE_NAME } from '@class-info/backend/convex/config';
	import { invalidateAll } from '$app/navigation';
	import { getNowInKst, isAtOrAfterDinnerEnd, schoolDisplayClock } from '$lib/date';

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

	// Wait a beat before showing a spinner, then keep it up long enough not to flash.
	const PENDING_DELAY_MS = 80;
	const PENDING_MIN_MS = 320;

	let showPending = $state(false);
	// Plain locals, so the effect does not depend on state it writes.
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
		configure({
			collectorUrl: 'https://collector.onedollarstats.com/events',
			autocollect: true,
		});
	});

	// Loads compute "today" and the 4pm/dinner cutoffs once. Re-run them when the
	// clock crosses one, so a tab left open overnight doesn't show yesterday.
	onMount(() => {
		const clockKey = () => {
			const now = getNowInKst();
			const { today, afterRollover } = schoolDisplayClock(now);
			return `${today}|${afterRollover}|${isAtOrAfterDinnerEnd(now)}`;
		};
		let key = clockKey();

		const check = () => {
			if (document.visibilityState !== 'visible') return;
			const next = clockKey();
			if (next === key) return;
			key = next;
			void invalidateAll();
		};

		const interval = setInterval(check, 60_000);
		document.addEventListener('visibilitychange', check);
		return () => {
			clearInterval(interval);
			document.removeEventListener('visibilitychange', check);
		};
	});

	// Chrome applies :active before it knows a touch is a scroll; flag scrolling
	// so app.css can drop the press transform. Capturing, for nested scrollers.
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
    <a href="#main" class="sr-only focus:not-sr-only focus:fixed focus:z-[1000] focus:top-2 focus:left-2 focus:bg-primary focus:text-primary-foreground focus:px-3 focus:py-2 focus:rounded-lg">본문으로 건너뛰기</a>

	<!-- Global Header -->
	<header class="sticky top-0 z-30 bg-background border-b border-border">
		<div class="max-w-4xl mx-auto flex items-center justify-between gap-3 px-4 h-14">
			<a href="/" class="shrink-0 pressable" aria-label="홈" data-sveltekit-preload-data="hover">
				<span class="text-xl font-bold tracking-tight text-foreground">{SITE_NAME}</span>
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
