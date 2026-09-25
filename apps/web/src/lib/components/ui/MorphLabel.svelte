<script lang="ts">
import type { Snippet } from 'svelte';
import { Tween } from 'svelte/motion';
import { cubicIn } from 'svelte/easing';
import { blurFade, tweenMove } from '$lib/transitions';

// A control label that changes ("새 공지 추가" → "취소"). An invisible sizer
// holds the current label's width, the wrapper tweens to it, and the labels
// cross-fade on top. A ResizeObserver re-measures when the webfont lands.
// `leading` (a pending spinner) is measured with the label.

const { text, leading }: { text: string; leading?: Snippet } = $props();

const swapKey = $derived(`${leading ? 1 : 0} ${text}`);

let sizerEl = $state<HTMLElement | undefined>();
let measured = $state(false);
const width = new Tween(0, tweenMove);

// Ignore sub-pixel churn from hinting, which would otherwise kill the tween.
let lastMeasured = 0;
const EPS = 0.75;

function measure(el: HTMLElement, fromObserver: boolean) {
	const next = el.getBoundingClientRect().width;
	if (next <= 0 || Math.abs(next - lastMeasured) < EPS) return;
	lastMeasured = next;

	if (!measured) {
		width.set(next, { duration: 0 });
		measured = true;
		return;
	}

	// A reflow at rest (webfont landing) snaps; mid-flight it re-aims the tween.
	const atRest = Math.abs(width.current - width.target) < EPS;
	if (fromObserver && atRest) {
		width.set(next, { duration: 0 });
	} else {
		width.target = next;
	}
}

$effect(() => {
	swapKey;
	if (sizerEl) measure(sizerEl, false);
});

$effect(() => {
	const el = sizerEl;
	if (!el) return;
	const ro = new ResizeObserver(() => measure(el, true));
	ro.observe(el);
	return () => ro.disconnect();
});
</script>

<span
	class="relative inline-flex items-center justify-center overflow-hidden align-middle"
	style={measured ? `width:${width.current}px` : ''}
>
	<span
		bind:this={sizerEl}
		class="invisible inline-flex items-center gap-2 whitespace-nowrap"
		aria-hidden="true"
	>{#if leading}{@render leading()}{/if}{text}</span>

	{#key swapKey}
		<span
			class="absolute inset-0 flex items-center justify-center gap-2 whitespace-nowrap"
			in:blurFade={{ duration: 240, blur: 5 }}
			out:blurFade={{ duration: 180, blur: 5, easing: cubicIn }}
		>{#if leading}{@render leading()}{/if}{text}</span>
	{/key}
</span>
