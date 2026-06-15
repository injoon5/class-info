<script lang="ts">
import type { Snippet } from 'svelte';

let {
	class: klass = '',
	padded = true,
	children
}: {
	class?: string;
	padded?: boolean;
	children: Snippet;
} = $props();
</script>

<div class="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl {padded ? 'p-4' : ''} {klass}">
	{@render children()}
</div>
