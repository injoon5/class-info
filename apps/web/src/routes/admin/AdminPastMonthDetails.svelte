<script lang="ts">
import { useQuery } from 'convex-svelte';
import type { Snippet } from 'svelte';
import { fade, slide } from 'svelte/transition';
import { api } from '@class-info/backend/convex/_generated/api';
import type { SchoolClock } from '@class-info/backend/convex/dates';
import type { MinimalNotice } from '@class-info/backend/convex/validators';
import { fadeOut, reveal, slideNone, slideY, slideYOut } from '#lib/transitions.js';
import LoadingState from '#lib/components/ui/LoadingState.svelte';
import ErrorState from '#lib/components/ui/ErrorState.svelte';
import FluidHeight from '#lib/components/ui/FluidHeight.svelte';

// The page renders each row, so past notices share its editor and delete state.
const {
	monthKey,
	clock,
	dismissedIds,
	row
}: {
	monthKey: string;
	clock: SchoolClock;
	dismissedIds: Set<string>;
	row: Snippet<[MinimalNotice]>;
} = $props();

const groups = useQuery(api.notices.pastByMonth, () => ({ monthKey, ...clock }));

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
			<ErrorState error={groups.error} compact />
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
									{@render row(notice)}
								</div>
							{/each}
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</FluidHeight>
</div>
