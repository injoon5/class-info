<script lang="ts">
import { onMount, type Snippet } from 'svelte';
import { reducedMotion } from '$lib/transitions';

// Horizontally scrollable region shared by timetable / meals / calendar.
//
// The row runs edge to edge: it cancels the page's own `px-4` gutter with a
// matching negative margin and re-applies it as padding *inside* the scroll
// port. Content therefore starts exactly where it did before, but has the
// gutter to scroll through instead of stopping short of it — a grid that
// continues past the screen now looks like one.
//
// `anchor` is a selector for a descendant to bring into view once, on first
// layout — for a week grid that is wider than a phone, the interesting column
// is otherwise off-screen until the reader scrolls.
//
// `hint` is the line shown under the row while there is more to see. Its
// arrows track the scroll position, so they only ever point at content.
const {
	children,
	blurred = false,
	anchor,
	hint
}: { children: Snippet; blurred?: boolean; anchor?: string; hint?: string } = $props();

let scrollContainer = $state<HTMLDivElement>();

// Booleans, not pixel offsets: the hint only ever shows or hides an arrow, and
// storing the raw offsets re-ran the render on every frame of a scroll.
let canScrollBack = $state(false);
let canScrollForward = $state(false);
let aligned = false;

// Sub-pixel scroll positions and fractional layout widths mean the ends never
// land on exactly 0.
const EPS = 1;

function updateEdges() {
	if (!scrollContainer) return;
	const { scrollLeft, scrollWidth, clientWidth } = scrollContainer;
	const overflow = scrollWidth - clientWidth > EPS;
	canScrollBack = overflow && scrollLeft > EPS;
	canScrollForward = overflow && scrollWidth - clientWidth - scrollLeft > EPS;
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
	updateEdges();
}

onMount(() => {
	const el = scrollContainer;
	if (!el) return;
	const container: HTMLDivElement = el;

	alignToAnchor();
	updateEdges();
	// Safari settles layout a frame late often enough to matter here.
	const raf = requestAnimationFrame(alignToAnchor);

	// The container also has to follow its content: a swap that changes how
	// wide the row is without changing the box around it leaves the hint
	// describing the old content.
	const ro = new ResizeObserver(() => {
		alignToAnchor();
		updateEdges();
	});
	ro.observe(container);

	let observedChildren: Element[] = [];
	function observeChildren() {
		for (const child of observedChildren) ro.unobserve(child);
		observedChildren = Array.from(container.children);
		for (const child of observedChildren) ro.observe(child);
		alignToAnchor();
		updateEdges();
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

<div
	class="h-scroll overflow-x-auto overflow-y-hidden -mx-4 px-4 print:mx-0 print:px-0"
	bind:this={scrollContainer}
	onscroll={updateEdges}
>
	<!-- Width lives here, not on the port: a `filter` on the same box as
	     overflow-x kills panning on iOS, and a block child sized to the port
	     clips any min-width grid inside.
	     `container-type: inline-size` so children can size with `cqw` against
	     this port — a `%` width under `w-max` is cyclic and falls back to
	     content, which is how the meals row blew past its 37rem floor. -->
	<div
		class="w-max min-w-full"
		style="transition: filter 150ms ease-out, opacity 150ms ease-out; {blurActive
			? 'filter: blur(4px); opacity: 0.7;'
			: ''}"
	>
		{@render children()}
	</div>
</div>

<style>
	.h-scroll {
		-webkit-overflow-scrolling: touch;
		overscroll-behavior-x: contain;
		/* `manipulation` on button/a (app.css) is enough on Chrome. WebKit
		   keeps the gesture on the control, so a row of day-cells never pans. */
		touch-action: pan-x pan-y;
		container-type: inline-size;
		container-name: hscroll;
	}
	.h-scroll :global(:is(button, a)) {
		touch-action: pan-x pan-y;
	}
</style>

{#if hint && (canScrollBack || canScrollForward)}
	<!-- Both arrows keep their slot whether or not they are lit, so the label
	     stays put instead of sliding as the reader scrolls. -->
	<p
		class="mt-1.5 flex items-center justify-center gap-1.5 text-xs text-muted-foreground select-none pointer-events-none print:hidden"
	>
		<span
			aria-hidden="true"
			class="transition-opacity duration-150"
			style="opacity: {canScrollBack ? 1 : 0};">←</span
		>
		{hint}
		<span
			aria-hidden="true"
			class="transition-opacity duration-150"
			style="opacity: {canScrollForward ? 1 : 0};">→</span
		>
	</p>
{/if}
