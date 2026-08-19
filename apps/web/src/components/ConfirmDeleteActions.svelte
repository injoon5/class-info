<script lang="ts">
import { onMount } from 'svelte';
import { slide } from 'svelte/transition';
import { flip } from 'svelte/animate';
import { flipMove, slideNone, slideX, slideXOut } from '$lib/transitions';

// In-place confirm for a cheap delete. 삭제 keeps its identity and FLIPs into
// place; 수정 leaves and 취소 arrives on the x-axis. First paint is silent so
// a page of rows doesn't all slide in.
type Kind = 'default' | 'danger' | 'danger-confirm' | 'muted';
type Action = {
	id: 'edit' | 'delete' | 'cancel';
	label: string;
	kind: Kind;
	onclick: () => void;
};

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

const actions: Action[] = $derived(
	confirming
		? [
				{ id: 'delete', label: '삭제', kind: 'danger-confirm', onclick: onConfirmDelete },
				{ id: 'cancel', label: '취소', kind: 'muted', onclick: onCancel }
			]
		: [
				{ id: 'edit', label: '수정', kind: 'default', onclick: onEdit },
				{ id: 'delete', label: '삭제', kind: 'danger', onclick: onAskDelete }
			]
);

const sizeClass = $derived(size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-sm');

const KIND: Record<Kind, string> = {
	default: 'border-border text-foreground pointer:hover:bg-muted',
	danger: 'border-border text-destructive pointer:hover:bg-destructive/10',
	'danger-confirm': 'border-destructive bg-destructive/10 text-destructive pointer:hover:bg-destructive/20',
	muted: 'border-border text-muted-foreground pointer:hover:bg-muted pointer:hover:text-foreground'
};

function onKeydown(e: KeyboardEvent) {
	if (!confirming) return;
	if (e.key === 'Escape') {
		e.preventDefault();
		onCancel();
		return;
	}
	if (e.key === 'Enter' && !e.isComposing) {
		e.preventDefault();
		onConfirmDelete();
	}
}
</script>

<svelte:window onkeydown={onKeydown} />

<div class="flex gap-1.5 sm:gap-2 flex-shrink-0">
	{#each actions as action (action.id)}
		<button
			type="button"
			onclick={action.onclick}
			animate:flip={flipMove}
			in:slide={live && action.id !== 'delete' ? slideX : slideNone}
			out:slide={action.id === 'delete' ? slideNone : slideXOut}
			class="pressable touch-target rounded-lg font-semibold border transition-colors duration-150 {sizeClass} {KIND[action.kind]}"
		>{action.label}</button>
	{/each}
</div>
