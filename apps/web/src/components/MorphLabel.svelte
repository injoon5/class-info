<script lang="ts">
import { blurFade } from '$lib/transitions';

// A label that changes on the same control — "새 공지 추가" → "취소".
//
// Reserving the widest label's width (§2.4) stops the jump but leaves the
// control permanently too wide. Sliding the two labels past each other morphs
// the width but shows both at once mid-flight. So: an invisible sizer keeps the
// natural width of the *current* label, the wrapper animates to that width, and
// the visible labels cross over vertically on top of it. One label on screen at
// a time, and the control's width travels instead of snapping.
//
// The labels cross over without moving. Sliding them was worse than the jump it
// replaced: the wrapper has to clip to morph the width, so a flying label got
// sliced by that clip edge and left a hard cut through the glyphs. Blurring them
// out dissolves the old label instead of cutting it.

const { text }: { text: string } = $props();

let sizerEl = $state<HTMLElement | undefined>();
let width = $state<number | null>(null);

// Runs after the DOM is patched, so the sizer already holds the new label.
$effect(() => {
	text;
	if (sizerEl) width = sizerEl.getBoundingClientRect().width;
});
</script>

<span
	class="relative inline-flex items-center justify-center overflow-hidden align-middle transition-[width] duration-300 ease-out-expo"
	style={width === null ? '' : `width:${width}px`}
>
	<!-- In flow: sets the height and is what gets measured. Never seen. -->
	<span bind:this={sizerEl} class="invisible whitespace-nowrap" aria-hidden="true">{text}</span>

	{#key text}
		<span
			class="absolute inset-0 flex items-center justify-center whitespace-nowrap"
			in:blurFade={{ duration: 240, blur: 5 }}
			out:blurFade={{ duration: 180, blur: 5 }}
		>{text}</span>
	{/key}
</span>
