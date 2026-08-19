<script lang="ts">
import { Tween } from 'svelte/motion';
import { tweenMove } from '$lib/transitions';
import type { Snippet } from 'svelte';
import { clampWindowScroll } from '$lib/scroll';

// Pixel-clip after first layout so a content swap (spinner → list) can tween
// height. Parent <details> open/close stays instant.
//
// ResizeObserver follows nested row slides with duration 0. A key-change
// tween has to win that race: the observer sees the new content immediately
// and would otherwise snap the clip to the destination before the tween
// starts. $effect.pre flags the swap before the DOM updates so RO is ignored
// until the tween is actually running from the old height.

const { key, children }: { key: string; children: Snippet } = $props();

let outer = $state<HTMLDivElement | undefined>();
let inner = $state<HTMLDivElement | undefined>();
let measured = $state(false);
const height = new Tween(0, tweenMove);

// Sub-pixel reflow is not a content change worth reacting to.
const EPS = 0.5;

let prevKey: string | null = null;
let pendingTween = false;
let lastClip = 0;

$effect.pre(() => {
	// Read `key` before anything can short-circuit past it. Guarding on
	// `prevKey` first meant the very first run never touched `key` at all, so
	// this effect registered no dependency and never ran again — every swap
	// after the first fell through to the observer and snapped.
	const k = key;
	if (prevKey !== null && k !== prevKey) pendingTween = true;
});

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
		// Cleared now, not in the promise: Svelte aborts an interrupted tween
		// without settling it, so a second swap mid-flight would have left this
		// latched on forever. The observer guards on the tween itself below.
		pendingTween = false;
		void height.set(next).then(clampWindowScroll);
		return;
	}

	prevKey = k;
});

$effect(() => {
	const el = inner;
	if (!el) return;
	const ro = new ResizeObserver(() => {
		if (!measured) return;
		// Mid-tween the observer is already looking at the destination content,
		// so snapping to it here would end the tween on its first frame.
		if (Math.abs(height.current - height.target) > EPS) return;
		const next = el.offsetHeight;
		if (next > 0 && Math.abs(next - height.current) > EPS) {
			height.set(next, { duration: 0 });
		}
	});
	ro.observe(el);
	return () => ro.disconnect();
});

// Whether the current shrink is one the reader needs protecting from.
// Decided once when the shrink starts — the block collapses downward, so its
// top does not move while it does — rather than measured every frame.
let followShrink: boolean | null = null;

$effect(() => {
	const h = height.current;
	if (!measured) {
		lastClip = h;
		return;
	}
	const dh = lastClip - h;
	lastClip = h;
	if (dh <= 0) {
		followShrink = null;
		return;
	}
	if (followShrink === null) {
		// Only content that has already scrolled past the top of the viewport
		// takes the reader's position with it when it collapses. A block
		// collapsing in view — or below the fold — is the animation itself, and
		// scrolling to follow it yanks the page for no reason.
		followShrink = !!outer && outer.getBoundingClientRect().top < 0;
	}
	if (followShrink) {
		const el = document.scrollingElement ?? document.documentElement;
		el.scrollTop = Math.max(0, el.scrollTop - dh);
	}
	// Only while shrinking: iOS leaves the page parked past the new bottom
	// until the next touch. Growing can't strand it, so it costs no layout.
	clampWindowScroll();
});
</script>

<div
	bind:this={outer}
	class={measured ? 'overflow-hidden' : ''}
	style:height={measured ? `${height.current}px` : undefined}
>
	<div bind:this={inner} class="flow-root">
		{@render children()}
	</div>
</div>
