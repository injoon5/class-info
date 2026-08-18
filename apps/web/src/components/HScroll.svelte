<script lang="ts">
import { onMount, type Snippet } from 'svelte';

// Horizontally scrollable region with fade gradients that appear only on the
// side(s) that have more content. Shared by timetable / meals / calendar.
const { children, blurred = false }: { children: Snippet; blurred?: boolean } = $props();

let scrollContainer = $state<HTMLDivElement>();
let scrollLeft = $state(0);
let scrollRight = $state(0);

function updateGradients() {
	if (!scrollContainer) return;
	const { scrollLeft: left, scrollWidth, clientWidth } = scrollContainer;
	const hasOverflow = scrollWidth > clientWidth;
	scrollLeft = hasOverflow ? left : 0;
	scrollRight = hasOverflow ? scrollWidth - clientWidth - left : 0;
}

onMount(() => {
	updateGradients();
	const ro = new ResizeObserver(() => updateGradients());
	if (scrollContainer) ro.observe(scrollContainer);
	return () => ro.disconnect();
});
</script>

<div class="relative">
	<div
		class="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none transition-opacity duration-200"
		style="opacity: {scrollLeft > 0 ? 1 : 0};"
	></div>
	<div
		class="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none transition-opacity duration-200"
		style="opacity: {scrollRight > 0 ? 1 : 0};"
	></div>

	<div
		class="overflow-x-auto"
		bind:this={scrollContainer}
		onscroll={updateGradients}
		style="transition: filter 150ms ease, opacity 150ms ease; {blurred ? 'filter: blur(4px); opacity: 0.7;' : ''}"
	>
		{@render children()}
	</div>
</div>
