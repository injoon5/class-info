<script lang="ts">
import { Tween } from 'svelte/motion';
import { tweenCaret } from '$lib/transitions';

const { open }: { open: boolean } = $props();
const rotate = Tween.of(() => (open ? 90 : 0), tweenCaret);
</script>

<svg
	viewBox="0 0 20 20"
	fill="none"
	stroke="currentColor"
	stroke-width="2"
	class="w-4 h-4 flex-shrink-0 text-muted-foreground"
	style="transform: rotate({rotate.current}deg)"
	aria-hidden="true"
>
	<path stroke-linecap="round" stroke-linejoin="round" d="M7.5 4.5l5 5.5-5 5.5" />
</svg>
