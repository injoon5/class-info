<script lang="ts">
import NoticeGroup from './NoticeGroup.svelte';

export let pastNoticesByMonth: any[];
</script>

{#if pastNoticesByMonth.length > 0}
	<div class="mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-neutral-200 dark:border-neutral-700">
		<h2 class="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-neutral-500 dark:text-neutral-400">지난 알림</h2>
		{#each pastNoticesByMonth as monthGroup}
			<details class="mb-3 sm:mb-4 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded">
				<summary class="px-3 sm:px-4 py-2 sm:py-3 cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-700 text-neutral-500 dark:text-neutral-400 font-medium text-sm sm:text-base">
					{monthGroup.monthName} ({monthGroup.groups.reduce((sum, g) => sum + g.notices.length, 0)}개)
				</summary>
				<div class="px-3 sm:px-4 pb-3 sm:pb-4">
					{#each monthGroup.groups as group}
						<NoticeGroup {group} isPast={true} />
					{/each}
				</div>
			</details>
		{/each}
	</div>
{/if}