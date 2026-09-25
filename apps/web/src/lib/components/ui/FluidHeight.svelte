<script lang="ts">
import { Tween } from 'svelte/motion';
import { tweenMove } from '$lib/transitions';
import type { Snippet } from 'svelte';
import { clampWindowScroll, scrollingEl, scrollIsTouchDriven, visibleTop } from '$lib/scroll';

// Tweens height when `key` changes (spinner → list); follows other size
// changes instantly. Uses `overflow: clip`, since `hidden` makes a scroll
// container that steals pans from an ancestor horizontal scroller on iOS.

const { key, children }: { key: string; children: Snippet } = $props();

let outer = $state<HTMLDivElement | undefined>();
let inner = $state<HTMLDivElement | undefined>();
let measured = $state(false);
const height = new Tween(0, tweenMove);

const EPS = 0.5;

let prevKey: string | null = null;
let pendingTween = false;
let lastClip = 0;

$effect.pre(() => {
	// Flag the swap before the DOM updates so the observer doesn't snap to it.
	// `key` is read first so the effect always tracks it.
	const k = key;
	if (prevKey !== null && k !== prevKey) pendingTween = true;
});

// Only a keyed swap moves the scroll position; observer snaps are reflows.
let compensating = false;

$effect(() => {
	const el = inner;
	const k = key;
	if (!el) return;

	const next = el.offsetHeight;
	if (next <= 0) return;

	if (!measured) {
		height.set(next, { duration: 0 });
		measured = true;
		prevKey = k;
		pendingTween = false;
		return;
	}

	if (pendingTween) {
		prevKey = k;
		// Cleared now: an interrupted tween never settles its promise.
		pendingTween = false;
		compensating = true;
		void height.set(next);
		return;
	}

	prevKey = k;
});

$effect(() => {
	const el = inner;
	if (!el) return;
	const ro = new ResizeObserver(() => {
		if (!measured) return;
		// Mid-tween the new content is already laid out; don't snap to it.
		if (Math.abs(height.current - height.target) > EPS) return;
		const next = el.offsetHeight;
		if (next > 0 && Math.abs(next - height.current) > EPS) {
			height.set(next, { duration: 0 });
		}
	});
	ro.observe(el);
	return () => ro.disconnect();
});

// Decided once per shrink rather than measured every frame.
let followShrink: boolean | null = null;

$effect(() => {
	const h = height.current;
	const settled = Math.abs(h - height.target) < EPS;

	if (!measured) {
		lastClip = h;
		return;
	}

	const dh = lastClip - h;
	lastClip = h;

	if (dh > 0 && compensating && !scrollIsTouchDriven()) {
		if (followShrink === null) {
			// Follow only a block that starts above the visible area.
			followShrink = !!outer && outer.getBoundingClientRect().top < visibleTop();
		}
		if (followShrink) {
			const el = scrollingEl();
			el.scrollTop = Math.max(0, el.scrollTop - dh);
		}
		clampWindowScroll();
	}

	if (dh <= 0) followShrink = null;

	if (settled && compensating) {
		compensating = false;
		followShrink = null;
		if (!scrollIsTouchDriven()) clampWindowScroll();
	}
});
</script>

<div
	bind:this={outer}
	class={measured ? 'overflow-y-clip' : ''}
	style:height={measured ? `${height.current}px` : undefined}
>
	<div bind:this={inner} class="flow-root">
		{@render children()}
	</div>
</div>
