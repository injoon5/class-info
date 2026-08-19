<script lang="ts">
import type { Snippet } from 'svelte';
import MorphLabel from './MorphLabel.svelte';

// The pill that recurs across the app. Each variant declares its own hover and
// active fills, so a caller never has to re-derive them — and a new pill can't
// drift from the others on the next change.
//
// §6 spells the variants with @apply; Tailwind 4 does not process @apply inside
// a Svelte <style> block, so the equivalent here is a variant → classes record.

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

const {
	text,
	variant = 'primary',
	type = 'button',
	href,
	onclick,
	disabled = false,
	size = 'md',
	emphasized = false,
	pending = false,
	morph = false,
	class: className = '',
	children
}: {
	text?: string;
	variant?: Variant;
	type?: 'button' | 'submit';
	href?: string;
	onclick?: () => void;
	disabled?: boolean;
	size?: 'sm' | 'md';
	/** Rings the one control a user with nothing on screen should press. */
	emphasized?: boolean;
	/** Shows a spinner in place of nothing; keep `text` as the pending label. */
	pending?: boolean;
	/** Animate the button's width when `text` changes instead of snapping. */
	morph?: boolean;
	class?: string;
	children?: Snippet;
} = $props();

const VARIANTS: Record<Variant, string> = {
	primary:
		'bg-primary text-primary-foreground enabled:pointer:hover:opacity-90 enabled:active:opacity-80',
	secondary:
		'border border-border text-foreground enabled:pointer:hover:bg-muted enabled:active:bg-border',
	ghost:
		'text-muted-foreground enabled:pointer:hover:text-foreground enabled:pointer:hover:bg-muted enabled:active:bg-border',
	danger:
		'border border-border text-destructive enabled:pointer:hover:bg-destructive/10 enabled:active:bg-destructive/20'
};

const SIZES: Record<'sm' | 'md', string> = {
	sm: 'px-3 py-1.5 text-xs',
	md: 'px-4 py-2 text-sm'
};

const base = $derived(
	`pressable touch-target inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-colors duration-150 ` +
		`disabled:cursor-not-allowed disabled:opacity-50 ring-ring ring-offset-2 ring-offset-background ` +
		`${SIZES[size]} ${VARIANTS[variant]} ${emphasized ? 'ring-2' : ''} ${className}`
);
</script>

{#snippet spinner()}
	<span
		class="w-3.5 h-3.5 flex-shrink-0 rounded-full border-2 border-current/40 border-t-current animate-spin"
		aria-hidden="true"
	></span>
{/snippet}

{#if href}
	<a {href} class={base} aria-disabled={disabled || undefined}>
		{#if children}{@render children()}{:else if morph && text}<MorphLabel {text} />{:else}{text}{/if}
	</a>
{:else}
	<button {type} {onclick} {disabled} class={base}>
		<!-- A morphing label measures the spinner with the text. Beside it, the
		     spinner snapped the button wider by its own width plus the gap the
		     instant it appeared, while the label width was still travelling. -->
		{#if children}
			{#if pending}{@render spinner()}{/if}
			{@render children()}
		{:else if morph && text}
			<MorphLabel {text} leading={pending ? spinner : undefined} />
		{:else}
			{#if pending}{@render spinner()}{/if}
			{text}
		{/if}
	</button>
{/if}
