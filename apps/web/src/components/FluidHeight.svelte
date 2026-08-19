<script lang="ts">
import { Tween } from 'svelte/motion';
import { tweenMove } from '$lib/transitions';
import type { Snippet } from 'svelte';

// Pixel-clip after first layout so a content swap (spinner → list) can tween
// height. Parent <details> open/close stays instant.
//
// ResizeObserver follows nested row slides with duration 0. A key-change
// tween has to win that race: the observer sees the new content immediately
// and would otherwise snap the clip to the destination before the tween
// starts. $effect.pre flags the swap before the DOM updates so RO is ignored
// until the tween is actually running from the old height.

const { key, children }: { key: string; children: Snippet } = $props();

let inner = $state<HTMLDivElement | undefined>();
let measured = $state(false);
const height = new Tween(0, tweenMove);

let prevKey: string | null = null;
let pendingTween = false;

$effect.pre(() => {
	if (prevKey !== null && key !== prevKey) pendingTween = true;
});

$effect(() => {
	const el = inner;
	const k = key;
	if (!el) return;

	const next = el.offsetHeight;
	if (next <= 0) return;

	if (!measured) {
		height.set(next, { duration: 0 });
		measured = true;
		prevKey = k;
		pendingTween = false;
		return;
	}

	if (pendingTween) {
		prevKey = k;
		void height.set(next).then(() => {
			pendingTween = false;
		});
		return;
	}

	prevKey = k;
});

$effect(() => {
	const el = inner;
	if (!el) return;
	const ro = new ResizeObserver(() => {
		if (pendingTween || !measured) return;
		const next = el.offsetHeight;
		if (next > 0) height.set(next, { duration: 0 });
	});
	ro.observe(el);
	return () => ro.disconnect();
});
</script>

<div
	class={measured ? 'overflow-hidden' : ''}
	style:height={measured ? `${height.current}px` : undefined}
>
	<div bind:this={inner} class="flow-root">
		{@render children()}
	</div>
</div>
