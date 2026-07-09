<script lang="ts">
	import '../app.css';
	import { PUBLIC_CONVEX_URL } from '$env/static/public';
	import { setupConvex } from 'convex-svelte';
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import { configure } from 'onedollarstats';

	const { children } = $props();
	setupConvex(PUBLIC_CONVEX_URL);

	const navItems = [
		{ href: '/notices', label: '공지', isActive: (path: string) => path.startsWith('/notices') || path.startsWith('/notice/') },
		{ href: '/timetable', label: '시간표', isActive: (path: string) => path.startsWith('/timetable') },
		{ href: '/meals', label: '급식', isActive: (path: string) => path.startsWith('/meals') },
		{ href: '/calendar', label: '일정', isActive: (path: string) => path.startsWith('/calendar') },
	];

	// Scroll edge effect: the hairline under the chrome only appears once
	// content actually passes underneath it.
	let scrolled = $state(false);

	onMount(() => {
		configure({
			collectorUrl: 'https://collector.onedollarstats.com/events',
			autocollect: true,
		});

		const onScroll = () => { scrolled = window.scrollY > 4; };
		onScroll();
		window.addEventListener('scroll', onScroll, { passive: true });
		return () => window.removeEventListener('scroll', onScroll);
	});
</script>

<a href="#main" class="sr-only focus:not-sr-only focus:fixed focus:z-[1000] focus:top-2 focus:left-2 focus:bg-neutral-900 focus:text-white focus:px-3 focus:py-2 focus:rounded-lg">Skip to content</a>

<!-- Global chrome: translucent, content scrolls underneath -->
<header class="sticky top-0 z-40 material-chrome">
	<div class="max-w-4xl mx-auto px-4">
		<div class="flex justify-between items-center gap-2 h-[52px] sm:h-[56px]">
			<a
				href="/"
				class="text-[17px] sm:text-lg font-bold tracking-[-0.01em] text-neutral-900 dark:text-neutral-100 hover:opacity-70 transition-opacity duration-150"
				aria-current={page.url.pathname === '/' ? 'page' : undefined}
			>TimeforSchool</a>
			<nav class="flex items-center gap-0.5 sm:gap-1" aria-label="주 메뉴">
				{#each navItems as item}
					{@const active = item.isActive(page.url.pathname)}
					<a
						href={item.href}
						class="pressable px-2.5 sm:px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors duration-150
							{active
								? 'bg-neutral-950/[0.07] dark:bg-white/[0.1] text-neutral-900 dark:text-white'
								: 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'}"
						aria-current={active ? 'page' : undefined}
					>{item.label}</a>
				{/each}
			</nav>
		</div>
	</div>
	<div
		class="h-px bg-[var(--separator)] transition-opacity duration-300"
		style="opacity: {scrolled ? 1 : 0};"
		aria-hidden="true"
	></div>
</header>

<main id="main">
	{@render children()}
</main>

<div aria-live="polite" aria-atomic="true" class="sr-only" id="aria-live-region"></div>
