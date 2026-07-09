<script lang="ts">
import NoticeCard from './NoticeCard.svelte';

let { group, isPast = false }: { group: any; isPast?: boolean } = $props();
</script>

<div class="{isPast ? 'mb-4 last:mb-0' : 'mb-5 sm:mb-7'}">
	{#if isPast}
		<h3 class="text-xs font-semibold uppercase tracking-wide mb-2 text-neutral-400 dark:text-neutral-500 px-0.5">
			{group.displayDate}
		</h3>
	{:else}
		<h2 class="text-[17px] font-semibold tracking-[-0.01em] mb-2.5 text-neutral-900 dark:text-neutral-100 px-0.5 flex items-baseline gap-2">
			{group.displayDate}
			{#if group.isToday}
				<span class="text-xs font-semibold px-1.5 py-0.5 rounded-full bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900">오늘</span>
			{/if}
		</h2>
	{/if}

	<div class="grid gap-2">
		{#each group.notices as notice}
			<NoticeCard {notice} {isPast} />
		{/each}
	</div>
</div>
