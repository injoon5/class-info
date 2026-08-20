<script lang="ts">
import { onMount, type Snippet } from 'svelte';
import { reducedMotion } from '$lib/transitions';

// Horizontally scrollable region with fade gradients that appear only on the
// side(s) that have more content. Shared by timetable / meals / calendar.
//
// `anchor` is a selector for a descendant to bring into view once, on first
// layout — for a week grid that is wider than a phone, the interesting column
// is otherwise off-screen until the reader scrolls.
const {
	children,
	blurred = false,
	anchor
}: { children: Snippet; blurred?: boolean; anchor?: string } = $props();

let scrollContainer = $state<HTMLDivElement>();

// Booleans, not pixel offsets: the gradients are only ever on or off, and
// storing the raw offsets re-ran the render on every frame of a scroll.
let hasBefore = $state(false);
let hasAfter = $state(false);
let aligned = false;

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

// Assigns scrollLeft rather than calling scrollIntoView: on iOS the latter
// also scrolls the page vertically and can pick an ancestor scroll port. Runs
// at most once, so it never fights a reader who has already scrolled.
function alignToAnchor() {
	if (aligned || !anchor || !scrollContainer) return;
	// Not laid out yet — retry from the ResizeObserver.
	if (scrollContainer.clientWidth === 0) return;
	const el = scrollContainer.querySelector<HTMLElement>(anchor);
	if (!el) return;

	const max = scrollContainer.scrollWidth - scrollContainer.clientWidth;
	if (max > 0) {
		const port = scrollContainer.getBoundingClientRect();
		const target = el.getBoundingClientRect();
		// Centre it when there is room; the clamp pins it to whichever edge it
		// sits nearest, which is what brings its neighbours along with it.
		const delta = target.left - port.left - (port.width - target.width) / 2;
		scrollContainer.scrollLeft = Math.min(Math.max(scrollContainer.scrollLeft + delta, 0), max);
	}
	aligned = true;
	updateGradients();
}

onMount(() => {
	const el = scrollContainer;
	if (!el) return;
	const container: HTMLDivElement = el;

	alignToAnchor();
	updateGradients();
	// Safari settles layout a frame late often enough to matter here.
	const raf = requestAnimationFrame(alignToAnchor);

	// The container also has to follow its content: a swap that changes how
	// wide the row is without changing the box around it leaves the gradients
	// describing the old content.
	const ro = new ResizeObserver(() => {
		alignToAnchor();
		updateGradients();
	});
	ro.observe(container);

	let observedChildren: Element[] = [];
	function observeChildren() {
		for (const child of observedChildren) ro.unobserve(child);
		observedChildren = Array.from(container.children);
		for (const child of observedChildren) ro.observe(child);
		alignToAnchor();
		updateGradients();
	}
	observeChildren();

	const mo = new MutationObserver(observeChildren);
	mo.observe(container, { childList: true });

	return () => {
		cancelAnimationFrame(raf);
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
