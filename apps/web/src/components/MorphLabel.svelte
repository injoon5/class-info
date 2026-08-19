<script lang="ts">
import { Tween } from 'svelte/motion';
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

const { text }: { text: string } = $props();

let sizerEl = $state<HTMLElement | undefined>();
let measured = $state(false);
const width = new Tween(0, tweenMove);

$effect(() => {
	text;
	if (!sizerEl) return;
	const next = sizerEl.getBoundingClientRect().width;
	if (!measured) {
		width.set(next, { duration: 0 });
		measured = true;
	} else {
		width.target = next;
	}
});
</script>

<span
	class="relative inline-flex items-center justify-center overflow-hidden align-middle"
	style={measured ? `width:${width.current}px` : ''}
>
	<span bind:this={sizerEl} class="invisible whitespace-nowrap" aria-hidden="true">{text}</span>

	{#key text}
		<span
			class="absolute inset-0 flex items-center justify-center whitespace-nowrap"
			in:blurFade={{ duration: 240, blur: 5 }}
			out:blurFade={{ duration: 180, blur: 5 }}
		>{text}</span>
	{/key}
</span>
