<script lang="ts">
import { Tween } from 'svelte/motion';
import { tweenMove } from '$lib/transitions';
import type { Snippet } from 'svelte';

// Tweens height only when `key` changes (spinner → list). Stays `height: auto`
// otherwise so nested slide/flip on rows still own their own motion.

const { key, children }: { key: string; children: Snippet } = $props();

let box = $state<HTMLDivElement | undefined>();
let inner = $state<HTMLDivElement | undefined>();
let locked = $state(false);
const height = new Tween(0, tweenMove);

let booted = false;
let fromHeight = 0;
let gen = 0;

$effect.pre(() => {
	key;
	fromHeight = box?.offsetHeight ?? 0;
});

$effect(() => {
	key;
	const el = inner;
	if (!el) return;
	if (!booted) {
		booted = true;
		return;
	}

	const to = el.offsetHeight;
	if (to === fromHeight) return;

	const id = ++gen;
	height.set(fromHeight, { duration: 0 });
	locked = true;
	void height.set(to).then(() => {
		if (id === gen) locked = false;
	});
});
</script>

<div
	bind:this={box}
	class={locked ? 'overflow-hidden' : ''}
	style:height={locked ? `${height.current}px` : undefined}
>
	<div bind:this={inner} class="flow-root">
		{@render children()}
	</div>
</div>
