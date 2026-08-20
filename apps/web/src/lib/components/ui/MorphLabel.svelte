<script lang="ts">
import type { Snippet } from 'svelte';
import { Tween } from 'svelte/motion';
import { cubicIn } from 'svelte/easing';
import { blurFade, tweenMove } from '$lib/transitions';

// A label that changes on the same control — "새 공지 추가" → "취소".
//
// Reserving the widest label's width (§2.4) stops the jump but leaves the
// control permanently too wide. Sliding the two labels past each other morphs
// the width but shows both at once mid-flight. So: an invisible sizer keeps the
// natural width of the *current* label, the wrapper animates to that width, and
// the visible labels cross over vertically on top of it. One label on screen at
// a time, and the control's width travels instead of snapping.
//
// Width is a Tween (expoOut), not a CSS cubic — same easing as every other move.
// The labels cross over without flying: the wrapper has to clip to morph the
// width, so a flying label got sliced by that clip edge.
//
// `leading` (a pending spinner, in practice) is measured with the label rather
// than sitting beside it. As a sibling it snapped the control wider by its own
// width plus the gap the instant it appeared, so half the width change was
// animated and half was not.
//
// The wrapper clips, so a width measured against the wrong font clips the
// label. Interlude is a dynamic per-glyph subset served `font-display: swap`,
// so the first measurement of a Korean label is almost always fallback
// metrics — a ResizeObserver on the sizer re-measures when the real face
// lands (and on any later reflow), instead of pinning the label to a width
// that was only ever right for one frame.

const { text, leading }: { text: string; leading?: Snippet } = $props();

// Swapping the spinner in or out changes the label as much as the text does,
// and has to cross over the same way.
const swapKey = $derived(`${leading ? 1 : 0} ${text}`);

let sizerEl = $state<HTMLElement | undefined>();
let measured = $state(false);
const width = new Tween(0, tweenMove);

// The last width the sizer reported. Sub-pixel churn is not a new label:
// hinting alone moved the measurement by ~0.6px a frame after the swap, and
// treating that as a reflow snapped the wrapper to the destination and killed
// the tween that had just started.
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

	// Snap only for a reflow that arrives while the label is sitting still —
	// the webfont landing, nothing the user did. A reflow that lands mid-flight
	// re-aims the tween instead of ending it.
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
