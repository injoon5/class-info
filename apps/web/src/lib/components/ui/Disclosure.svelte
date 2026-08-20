<script lang="ts">
import { slide } from 'svelte/transition';
import { reducedMotion, slideY, slideYOut } from '$lib/transitions';
import DisclosureCaret from './DisclosureCaret.svelte';
import type { Snippet } from 'svelte';

// A section that opens. `open` is owned by the page — the past-notice lists
// keep one month open at a time — so this cannot toggle itself; it reports the
// click and animates whatever the page decides.
//
// `<details>` stops painting everything but the summary the instant `open`
// goes false, which would swallow the collapse before its first frame. So the
// element stays open until the outro has finished, and the content's presence
// is the `{#if}` below rather than the attribute. The attribute still moves,
// because it is what tells assistive tech the section is expanded.
//
// The page can close this one without the click landing here — opening
// another month closes it — so the close is caught on the `open` edge rather
// than in the handler.

const {
	open,
	label,
	onToggle,
	class: className = '',
	children
}: {
	open: boolean;
	label: string;
	onToggle: () => void;
	class?: string;
	children: Snippet;
} = $props();

let closing = $state(false);
let wasOpen = open;

$effect(() => {
	if (open === wasOpen) return;
	wasOpen = open;
	// Runs before paint, so the attribute never flickers shut for a frame.
	// Under reduced motion there is no collapse to wait for and Svelte never
	// reports an `outroend` for the zero-length one, so nothing would ever
	// clear this again.
	closing = !open && !reducedMotion();
});
</script>

<details
	class="bg-card border border-border rounded-3xl overflow-hidden {className}"
	open={open || closing}
>
	<summary
		class="touch-target flex items-center gap-2 px-3 sm:px-4 py-2.5 sm:py-3 cursor-pointer list-none transition-colors duration-150 pointer:hover:bg-muted text-muted-foreground font-semibold text-sm sm:text-base [&::-webkit-details-marker]:hidden"
		onclick={(e) => {
			e.preventDefault();
			onToggle();
		}}
	>
		<DisclosureCaret {open} />
		{label}
	</summary>
	{#if open}
		<div in:slide={slideY} out:slide={slideYOut} onoutroend={() => (closing = false)}>
			{@render children()}
		</div>
	{/if}
</details>
