<script lang="ts">
import type { Snippet } from 'svelte';

let {
	label,
	for: forId,
	hint = '',
	error = '',
	children
}: {
	label?: string;
	for?: string;
	hint?: string;
	error?: string;
	children: Snippet;
} = $props();
</script>

<div>
	{#if label}
		<label for={forId} class="block text-sm font-medium mb-1 text-neutral-600 dark:text-neutral-300">{label}</label>
	{/if}
	{@render children()}
	{#if error}
		<p class="text-xs text-red-600 dark:text-red-400 mt-1">{error}</p>
	{:else if hint}
		<p class="text-xs text-neutral-400 dark:text-neutral-500 mt-1">{hint}</p>
	{/if}
</div>
