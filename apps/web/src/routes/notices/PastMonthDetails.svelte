<script lang="ts">
import { useQuery } from 'convex-svelte';
import { api } from '@class-info/backend/convex/_generated/api';
import { fade } from 'svelte/transition';
import { fadeOut, reveal } from '$lib/transitions';
import NoticeGroup from './NoticeGroup.svelte';
import LoadingState from '$lib/components/ui/LoadingState.svelte';
import FluidHeight from '$lib/components/ui/FluidHeight.svelte';

const { monthKey, cutoff, today }: { monthKey: string; cutoff: string; today: string } = $props();

const groups = useQuery(api.notices.pastByMonth, () => ({ monthKey, cutoff, today }));
</script>

<div class="px-3 pb-3 pt-1">
	<FluidHeight key={groups.isLoading ? 'loading' : groups.error ? 'error' : 'ready'}>
		{#if groups.isLoading}
			<LoadingState compact />
		{:else if groups.error}
			<div class="text-sm text-destructive py-3 text-center">불러오지 못했어요</div>
		{:else}
			<div in:reveal out:fade={fadeOut}>
				{#each groups.data ?? [] as group (group.date)}
					<NoticeGroup {group} isPast />
				{/each}
			</div>
		{/if}
	</FluidHeight>
</div>
