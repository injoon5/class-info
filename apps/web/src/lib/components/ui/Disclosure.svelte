<script lang="ts">
import { slide } from 'svelte/transition';
import { reducedMotion, slideY, slideYOut } from '$lib/transitions';
import DisclosureCaret from './DisclosureCaret.svelte';
import type { Snippet } from 'svelte';

// A section the page opens and closes (one past month at a time). The
// <details> stays open until the collapse finishes, since it stops painting
// its content the instant `open` goes false.

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
	// Reduced motion never fires `outroend` for the zero-length collapse.
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
