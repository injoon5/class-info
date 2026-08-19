<script lang="ts">
import { Tween } from 'svelte/motion';
import { tweenMove } from '$lib/transitions';
import type { Snippet } from 'svelte';
import { clampWindowScroll, scrollingEl, scrollIsTouchDriven, visibleTop } from '$lib/scroll';

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

// Set only for a height change the reader asked for. The observer's snaps are
// reflows — a rotation, the phone's URL bar sliding in or out — and following
// one of those with the scroll position *is* the jump, not the fix.
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
		// Cleared now, not in a promise: Svelte aborts an interrupted tween
		// without settling it, so a second swap mid-flight would have left this
		// latched on forever. The observer guards on the tween itself below,
		// and `compensating` is cleared when the tween lands.
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
// top does not move while it does — rather than measured every frame, which on
// a phone is a forced layout per frame on top of the one the height causes.
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

	// Standing down while a finger is on the glass means the page does not
	// follow that stretch of the collapse — which is right: the reader is
	// scrolling, not holding a position, and fighting them for it reads far
	// worse than the drift does.
	if (dh > 0 && compensating && !scrollIsTouchDriven()) {
		if (followShrink === null) {
			// Only content that has already scrolled past the top of the visible
			// area takes the reader's position with it when it collapses. A block
			// collapsing in view — or below the fold — is the animation itself,
			// and scrolling to follow it yanks the page for no reason.
			followShrink = !!outer && outer.getBoundingClientRect().top < visibleTop();
		}
		if (followShrink) {
			const el = scrollingEl();
			el.scrollTop = Math.max(0, el.scrollTop - dh);
		}
		// Only while shrinking: iOS leaves the page parked past the new bottom
		// until the next touch. Growing can't strand it, so it costs no layout.
		clampWindowScroll();
	}

	if (dh <= 0) followShrink = null;

	if (settled && compensating) {
		compensating = false;
		followShrink = null;
		// Final clamp, in place of the tween's promise — an interrupted tween
		// never settles that promise, so it could not be relied on. If a touch
		// owns the scroll, scroll.ts clamps when the finger lifts instead.
		if (!scrollIsTouchDriven()) clampWindowScroll();
	}
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
