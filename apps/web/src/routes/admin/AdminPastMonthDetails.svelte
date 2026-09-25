<script lang="ts">
import { useQuery } from 'convex-svelte';
import type { Snippet } from 'svelte';
import { fade, slide } from 'svelte/transition';
import { api } from '@class-info/backend/convex/_generated/api';
import type { Id } from '@class-info/backend/convex/_generated/dataModel';
import { fadeOut, reveal, slideNone, slideY, slideYOut } from '$lib/transitions';
import LoadingState from '$lib/components/ui/LoadingState.svelte';
import FluidHeight from '$lib/components/ui/FluidHeight.svelte';
import AdminNoticeRow from './AdminNoticeRow.svelte';

// Past notices are edited in their own row, with the page's editor.
let {
	monthKey,
	cutoff,
	today,
	onEdit,
	onDelete,
	editorTarget = null,
	editor,
	dismissedIds,
	confirmingDeleteId = $bindable(null)
}: {
	monthKey: string;
	cutoff: string;
	today: string;
	onEdit: (id: Id<'notices'>) => void;
	onDelete: (id: Id<'notices'>) => void;
	editorTarget?: string | null;
	editor: Snippet;
	dismissedIds: Set<string>;
	confirmingDeleteId?: string | null;
} = $props();

const groups = useQuery(api.notices.pastByMonth, () => ({ monthKey, cutoff, today }));

// The first ready paint is silent so FluidHeight tweens spinner → list whole.
let listLive = $state(false);
$effect(() => {
	if (groups.isLoading || groups.error) {
		listLive = false;
		return;
	}
	const frame = requestAnimationFrame(() => (listLive = true));
	return () => cancelAnimationFrame(frame);
});
const listSlide = $derived(listLive ? slideY : slideNone);

const visibleGroups = $derived(
	(groups.data ?? [])
		.map((g) => ({ ...g, notices: g.notices.filter((n) => !dismissedIds.has(String(n._id))) }))
		.filter((g) => g.notices.length > 0)
);
</script>

<div class="px-3 pb-3 pt-1">
	<FluidHeight key={groups.isLoading ? 'loading' : groups.error ? 'error' : 'ready'}>
		{#if groups.isLoading}
			<LoadingState compact />
		{:else if groups.error}
			<div class="text-sm text-destructive py-3 text-center">불러오지 못했어요</div>
		{:else}
			<div in:reveal out:fade={fadeOut}>
				{#each visibleGroups as group (group.date)}
					<div class="mb-3 last:mb-0" in:slide={listSlide} out:slide={slideYOut}>
						<h3 class="text-sm font-semibold mb-2 text-muted-foreground border-l-2 border-border pl-2">
							{group.displayDate}
						</h3>
						<div class="grid gap-2">
							{#each group.notices as notice (notice._id)}
								<div in:slide={listSlide} out:slide={slideYOut}>
									{#if editorTarget === String(notice._id)}
										{@render editor()}
									{:else}
										<AdminNoticeRow
											{notice}
											past
											confirming={confirmingDeleteId === String(notice._id)}
											{onEdit}
											onAskDelete={(id) => (confirmingDeleteId = String(id))}
											onDelete={(id) => {
												confirmingDeleteId = null;
												onDelete(id);
											}}
											onCancel={() => (confirmingDeleteId = null)}
										/>
									{/if}
								</div>
							{/each}
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</FluidHeight>
</div>
