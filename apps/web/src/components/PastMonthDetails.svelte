<script lang="ts">
import NoticeGroup from './NoticeGroup.svelte';
import { useQuery } from 'convex-svelte';
import { api } from "@class-info/backend/convex/_generated/api";

let { monthKey }: { monthKey: string } = $props();

const groups = useQuery(api.notices.pastByMonth, { monthKey });

</script>

<div class="px-3 sm:px-4 py-2 pb-3 sm:pb-4">
	{#if groups.isLoading}
		<div class="text-sm text-neutral-400 dark:text-neutral-500">불러오는 중…</div>
	{:else if groups.error}
		<div class="text-sm text-red-500">오류가 발생했습니다.</div>
	{:else}
		{#each groups.data as group}
			<NoticeGroup {group} isPast={true} />
		{/each}
	{/if}
</div>
