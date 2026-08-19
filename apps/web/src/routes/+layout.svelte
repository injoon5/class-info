<script lang="ts">
	import '../app.css';
	import { getConvexUrl } from '$lib/convex';
	import { setupConvex } from 'convex-svelte';
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import { configure } from 'onedollarstats';

	const { children } = $props();
	setupConvex(getConvexUrl());

	const navItems = [
		{ href: '/notices', label: '공지', match: (p: string) => p.startsWith('/notices') || p.startsWith('/notice/') },
		{ href: '/timetable', label: '시간표', match: (p: string) => p.startsWith('/timetable') },
		{ href: '/meals', label: '급식', match: (p: string) => p.startsWith('/meals') },
		{ href: '/calendar', label: '일정', match: (p: string) => p.startsWith('/calendar') }
	];

	onMount(() => {
		configure({
			collectorUrl: 'https://collector.onedollarstats.com/events',
			autocollect: true,
		});
	});
</script>
    <a href="#main" class="sr-only focus:not-sr-only focus:fixed focus:z-[1000] focus:top-2 focus:left-2 focus:bg-primary focus:text-primary-foreground focus:px-3 focus:py-2 focus:rounded-lg">본문으로 건너뛰기</a>

	<!-- Global Header -->
	<header class="sticky top-0 z-30 bg-background/85 backdrop-blur-md border-b border-border">
		<div class="max-w-4xl mx-auto flex items-center justify-between gap-3 px-4 h-14">
			<a href="/" class="shrink-0 pressable" aria-label="홈">
				<span class="text-base sm:text-lg font-bold tracking-tight text-foreground">TimeforSchool</span>
			</a>
			<nav class="flex items-center gap-1 sm:gap-2 text-list">
				{#each navItems as item}
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
		{@render children()}
	</main>

    <div aria-live="polite" aria-atomic="true" class="sr-only" id="aria-live-region"></div>
	
