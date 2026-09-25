<script lang="ts">
import { onMount, type Snippet } from 'svelte';

// Horizontal scroller for meals and calendar. It runs edge to edge (negative
// margin, padding inside), `anchor` scrolls a descendant into view once, and
// `hint` shows arrows while there is more to see.
const {
	children,
	blurred = false,
	anchor,
	hint
}: { children: Snippet; blurred?: boolean; anchor?: string; hint?: string } = $props();

let scrollContainer = $state<HTMLDivElement>();

let canScrollBack = $state(false);
let canScrollForward = $state(false);
let aligned = false;

const EPS = 1;

function updateEdges() {
	if (!scrollContainer) return;
	const { scrollLeft, scrollWidth, clientWidth } = scrollContainer;
	const overflow = scrollWidth - clientWidth > EPS;
	canScrollBack = overflow && scrollLeft > EPS;
	canScrollForward = overflow && scrollWidth - clientWidth - scrollLeft > EPS;
}

// scrollLeft, not scrollIntoView: on iOS that also scrolls the page.
function alignToAnchor() {
	if (aligned || !anchor || !scrollContainer) return;
	if (scrollContainer.clientWidth === 0) return;
	const el = scrollContainer.querySelector<HTMLElement>(anchor);
	if (!el) return;

	const max = scrollContainer.scrollWidth - scrollContainer.clientWidth;
	if (max > 0) {
		const port = scrollContainer.getBoundingClientRect();
		const target = el.getBoundingClientRect();
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
	const raf = requestAnimationFrame(alignToAnchor);

	// A content swap can change the row width without resizing the port.
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
</script>

<div
	class="h-scroll overflow-x-auto overflow-y-hidden -mx-4 px-4 print:mx-0 print:px-0"
	bind:this={scrollContainer}
	onscroll={updateEdges}
>
	<!-- Blur lives on this wrapper: `filter` on the scroll port kills panning
	     on iOS. The port is a size container so children can size in `cqw`. -->
	<div
		class="w-max min-w-full"
		style="transition: filter 150ms ease-out, opacity 150ms ease-out; {blurred
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
		/* WebKit keeps a pan on the control unless it allows panning too. */
		touch-action: pan-x pan-y;
		container-type: inline-size;
		container-name: hscroll;
	}
	.h-scroll :global(:is(button, a)) {
		touch-action: pan-x pan-y;
	}
</style>

{#if hint && (canScrollBack || canScrollForward)}
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
