<script lang="ts">
import { onMount } from 'svelte';
import { slide } from 'svelte/transition';
import { slideNone, slideX } from '$lib/transitions';

// In-place delete confirmation. `transition:` (not in/out) so a quick
// 삭제 → 취소 → 삭제 reverses instead of restarting.

const {
	confirming,
	onEdit,
	onAskDelete,
	onConfirmDelete,
	onCancel,
	size = 'md'
}: {
	confirming: boolean;
	onEdit: () => void;
	onAskDelete: () => void;
	onConfirmDelete: () => void;
	onCancel: () => void;
	size?: 'sm' | 'md';
} = $props();

let live = $state(false);
onMount(() => {
	live = true;
});
const rowSlide = $derived(live ? slideX : slideNone);

const sizeClass = $derived(size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-sm');
const btn = $derived(
	`pressable touch-target shrink-0 whitespace-nowrap rounded-lg font-semibold border transition-colors duration-150 ${sizeClass}`
);

// Enter confirms and Escape cancels while this row is asking.
$effect(() => {
	if (!confirming) return;
	const onKeydown = (e: KeyboardEvent) => {
		if (e.key === 'Escape') {
			e.preventDefault();
			onCancel();
			return;
		}
		if (e.key === 'Enter' && !e.isComposing) {
			// A focused control handles Enter itself (Enter on 취소 must cancel).
			if (e.target instanceof Element && e.target.closest('button, a, input, textarea, select')) {
				return;
			}
			e.preventDefault();
			onConfirmDelete();
		}
	};
	window.addEventListener('keydown', onKeydown);
	return () => window.removeEventListener('keydown', onKeydown);
});
</script>

<div class="flex shrink-0">
	{#if !confirming}
		<div transition:slide={rowSlide} class="pr-1.5 sm:pr-2">
			<button
				type="button"
				onclick={onEdit}
				class="{btn} border-border text-foreground pointer:hover:bg-muted"
			>수정</button>
		</div>
	{/if}

	<button
		type="button"
		onclick={confirming ? onConfirmDelete : onAskDelete}
		class="{btn} {confirming
			? 'border-destructive bg-destructive/10 text-destructive pointer:hover:bg-destructive/20'
			: 'border-border text-destructive pointer:hover:bg-destructive/10'}"
	>삭제</button>

	{#if confirming}
		<div transition:slide={rowSlide} class="pl-1.5 sm:pl-2">
			<button
				type="button"
				onclick={onCancel}
				class="{btn} border-border text-muted-foreground pointer:hover:bg-muted pointer:hover:text-foreground"
			>취소</button>
		</div>
	{/if}
</div>
