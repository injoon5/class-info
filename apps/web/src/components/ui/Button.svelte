<script lang="ts">
import type { Snippet } from 'svelte';

let {
	variant = 'primary',
	type = 'button',
	disabled = false,
	full = false,
	href,
	class: klass = '',
	onclick,
	children
}: {
	variant?: 'primary' | 'secondary' | 'danger';
	type?: 'button' | 'submit';
	disabled?: boolean;
	full?: boolean;
	href?: string;
	class?: string;
	onclick?: (e: MouseEvent) => void;
	children: Snippet;
} = $props();

const variants = {
	primary:
		'bg-neutral-800 dark:bg-neutral-200 text-white dark:text-neutral-900 hover:bg-neutral-700 dark:hover:bg-neutral-100',
	secondary:
		'border border-neutral-300 dark:border-neutral-600 text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700',
	danger: 'bg-red-600 text-white hover:bg-red-500'
};

const base =
	'pressable-lg inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-50 disabled:pointer-events-none';
</script>

{#if href}
	<a {href} class="{base} {variants[variant]} {full ? 'w-full' : ''} {klass}">
		{@render children()}
	</a>
{:else}
	<button {type} {disabled} {onclick} class="{base} {variants[variant]} {full ? 'w-full' : ''} {klass}">
		{@render children()}
	</button>
{/if}
