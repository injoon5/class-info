<script lang="ts">
import NoticeCard from './NoticeCard.svelte';

let { group, isPast = false }: { group: any; isPast?: boolean } = $props();
</script>

<div class="{isPast ? 'mb-3 sm:mb-4 last:mb-0' : 'mb-4 sm:mb-6'}">
	{#if isPast}
		<h3 class="text-xs sm:text-sm font-medium mb-1.5 sm:mb-2 text-muted-foreground border-l-2 border-border pl-2">
			{group.displayDate}
		</h3>
	{:else}
		<h2 class="text-base sm:text-lg font-semibold tracking-tight mb-2 sm:mb-4 text-foreground border-l-[3px] border-foreground pl-3">
			{group.displayDate}
		</h2>
	{/if}
	
	<div class="grid gap-1.5 sm:gap-2">
		{#each group.notices as notice}
			<NoticeCard {notice} {isPast} />
		{/each}
	</div>
</div>