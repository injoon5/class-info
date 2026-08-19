<script lang="ts">
import { onMount, type Snippet } from 'svelte';
import { reducedMotion } from '$lib/transitions';

// Horizontally scrollable region with fade gradients that appear only on the
// side(s) that have more content. Shared by timetable / meals / calendar.
const { children, blurred = false }: { children: Snippet; blurred?: boolean } = $props();

let scrollContainer = $state<HTMLDivElement>();

// Booleans, not pixel offsets: the gradients are only ever on or off, and
// storing the raw offsets re-ran the render on every frame of a scroll.
let hasBefore = $state(false);
let hasAfter = $state(false);

// Sub-pixel scroll positions and fractional layout widths mean the ends never
// land on exactly 0.
const EPS = 1;

function updateGradients() {
	if (!scrollContainer) return;
	const { scrollLeft, scrollWidth, clientWidth } = scrollContainer;
	const overflow = scrollWidth - clientWidth > EPS;
	hasBefore = overflow && scrollLeft > EPS;
	hasAfter = overflow && scrollWidth - clientWidth - scrollLeft > EPS;
}

onMount(() => {
	const container = scrollContainer;
	if (!container) return;

	updateGradients();

	// The container also has to follow its content: a swap that changes how
	// wide the row is without changing the box around it leaves the gradients
	// describing the old content.
	const ro = new ResizeObserver(() => updateGradients());
	ro.observe(container);

	let observedChildren: Element[] = [];
	function observeChildren() {
		for (const child of observedChildren) ro.unobserve(child);
		observedChildren = Array.from(container!.children);
		for (const child of observedChildren) ro.observe(child);
		updateGradients();
	}
	observeChildren();

	const mo = new MutationObserver(observeChildren);
	mo.observe(container, { childList: true });

	return () => {
		ro.disconnect();
		mo.disconnect();
	};
});

// Under reduced motion the app-wide transition override drops `filter`, so a
// blur here would snap on and off — louder than the change it was softening.
const blurActive = $derived(blurred && !reducedMotion());
</script>

<div class="relative">
	<div
		class="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none transition-opacity duration-150"
		style="opacity: {hasBefore ? 1 : 0};"
	></div>
	<div
		class="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none transition-opacity duration-150"
		style="opacity: {hasAfter ? 1 : 0};"
	></div>

	<div
		class="overflow-x-auto"
		bind:this={scrollContainer}
		onscroll={updateGradients}
		style="transition: filter 150ms ease-out, opacity 150ms ease-out; {blurActive
			? 'filter: blur(4px); opacity: 0.7;'
			: ''}"
	>
		{@render children()}
	</div>
</div>
