<script lang="ts">
import NoticeGroup from './NoticeGroup.svelte';
import LoadingState from './LoadingState.svelte';
import { useQuery } from 'convex-svelte';
import { api } from "@class-info/backend/convex/_generated/api";
import { fade } from 'svelte/transition';
import { fadeFast } from '$lib/transitions';
import FluidHeight from './FluidHeight.svelte';

const { monthKey, cutoff, today }: { monthKey: string; cutoff: string; today: string } = $props();

const groups = useQuery(
	api.notices.pastByMonth,
	() => ({ monthKey, cutoff, today })
);

</script>

<div class="px-3 pb-3 pt-1">
	<FluidHeight key={groups.isLoading ? 'loading' : groups.error ? 'error' : 'ready'}>
	{#if groups.isLoading}
		<LoadingState compact />
	{:else if groups.error}
		<div class="text-sm text-destructive py-3 text-center">오류가 발생했습니다.</div>
	{:else}
		<div in:fade={fadeFast}>
			{#each groups.data ?? [] as group (group.date)}
				<NoticeGroup {group} isPast={true} />
			{/each}
		</div>
	{/if}
	</FluidHeight>
</div>
