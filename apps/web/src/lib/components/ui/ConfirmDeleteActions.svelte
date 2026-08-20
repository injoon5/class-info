<script lang="ts">
import { onMount } from 'svelte';
import { slide } from 'svelte/transition';
import { slideNone, slideX } from '$lib/transitions';

// In-place confirm. 삭제 is a stable node — it rides the flex layout as 수정
// collapses and 취소 grows. Flip+slide together were both translating 삭제,
// so 취소's reverse stuttered. `transition:slide` (not in/out) so a fast
// 삭제→취소→삭제 reverses instead of restarting — which is also why the slide
// eases `cubicOut` rather than the `expoOut` the one-way moves use: one curve
// has to read as motion in both directions. Gap lives as padding on the
// sliding wrappers so it doesn't pop in as a second flex gap at t=0.

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

// Bound only while this row is the one asking. Every row holding a window
// listener meant the page carried one per notice, and any row that happened
// to be confirming answered the same Enter.
$effect(() => {
	if (!confirming) return;
	const onKeydown = (e: KeyboardEvent) => {
		if (e.key === 'Escape') {
			e.preventDefault();
			onCancel();
			return;
		}
		if (e.key === 'Enter' && !e.isComposing) {
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
