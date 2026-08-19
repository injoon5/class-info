<script lang="ts">
import NoticeGroup from './NoticeGroup.svelte';
import LoadingState from './LoadingState.svelte';
import { useQuery } from 'convex-svelte';
import { api } from "@class-info/backend/convex/_generated/api";
import { fade, slide } from 'svelte/transition';
import { fadeFast, slideY } from '$lib/transitions';

const { monthKey }: { monthKey: string } = $props();

const groups = useQuery(api.notices.pastByMonth, { monthKey });

</script>

<div class="px-3 pb-3 pt-1">
	{#if groups.isLoading}
		<div out:fade={fadeFast}>
			<LoadingState compact />
		</div>
	{:else if groups.error}
		<div class="text-sm text-destructive py-3 text-center">오류가 발생했습니다.</div>
	{:else}
		<div in:slide={slideY}>
			{#each groups.data as group (group.date)}
				<NoticeGroup {group} isPast={true} />
			{/each}
		</div>
	{/if}
</div>
