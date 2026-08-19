<script lang="ts">
import NoticeGroup from './NoticeGroup.svelte';
import { useQuery } from 'convex-svelte';
import { api } from "@class-info/backend/convex/_generated/api";

const { monthKey }: { monthKey: string } = $props();

const groups = useQuery(api.notices.pastByMonth, { monthKey });

</script>

<div class="p-2 pt-0">
	{#if groups.isLoading}
		<div class="text-sm text-muted-foreground">불러오는 중…</div>
	{:else if groups.error}
		<div class="text-sm text-destructive">오류가 발생했습니다.</div>
	{:else}
		{#each groups.data as group (group.date)}
			<NoticeGroup {group} isPast={true} />
		{/each}
	{/if}
</div>
