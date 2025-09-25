<script lang="ts">
import NoticeCard from './NoticeCard.svelte';

export let group: any;
export let isPast = false;
</script>

<div class="{isPast ? 'mb-3 sm:mb-4 last:mb-0' : 'mb-4 sm:mb-6'}">
	{#if isPast}
		<h3 class="text-xs sm:text-sm font-medium mb-1.5 sm:mb-2 text-neutral-500 dark:text-neutral-400 border-l-2 border-neutral-300 dark:border-neutral-600 pl-2">
			{group.displayDate}
		</h3>
	{:else}
		<h2 class="text-base sm:text-lg font-semibold mb-2 sm:mb-4 text-neutral-600 dark:text-neutral-300 border-l-4 border-neutral-500 dark:border-neutral-400 pl-3">
			{group.displayDate}
		</h2>
	{/if}
	
	<div class="grid gap-1.5 sm:gap-2">
		{#each group.notices as notice}
			<NoticeCard {notice} {isPast} />
		{/each}
	</div>
</div>