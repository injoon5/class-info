<script lang="ts">
import { onMount } from 'svelte';
import { formatAbsolute, formatRelative } from '$lib/date';

// Absolute on the server, relative once mounted, so SSR and hydration agree.
const { ts }: { ts: number } = $props();

let now = $state<number | null>(null);
onMount(() => {
	now = Date.now();
});
</script>

<span title={formatAbsolute(ts)}>{now === null ? formatAbsolute(ts) : formatRelative(ts, now)}</span>
