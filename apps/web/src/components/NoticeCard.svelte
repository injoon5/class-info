<script lang="ts">
import { getTypeColor } from '../lib/utils.js';

const { notice, isPast = false }: { notice: any; isPast?: boolean } = $props();

const isLink = $derived(Boolean((notice?.summary && String(notice.summary).trim()) || notice?.hasFiles));

const containerClass = $derived(
    `${isPast ? 'bg-card/60 border-border opacity-80' : 'bg-card border-border'} border rounded-xl p-2.5 sm:p-3${isLink ? ' pressable-xl' : ''} ${isLink ? (isPast ? 'transition-opacity pointer:hover:opacity-100' : 'transition-colors pointer:hover:border-muted-foreground/40') : ''}`
);
const headerGapClass = $derived(`flex items-center gap-1.5 sm:gap-2 ${isPast ? 'mb-0.5 sm:mb-1' : 'mb-0.5 sm:mb-1'}`);
const typePillClass = $derived(`px-1.5 py-0.5 ${isPast ? 'text-xs' : 'text-xs sm:text-sm'} font-semibold rounded-md ${getTypeColor(notice.type)} ${isPast ? 'opacity-75' : ''}`);
const subjectClass = $derived(`${isPast ? 'text-xs font-medium text-muted-foreground' : 'text-sm font-semibold text-muted-foreground'}`);
const titleWrapClass = $derived(`flex items-center gap-1.5`);
const titleClass = $derived(`${isPast ? 'font-medium text-muted-foreground text-xs sm:text-sm' : 'font-semibold text-foreground text-[15px] sm:text-base'}`);
// Add overflow-hidden and break-words to prevent overflow
const summaryClass = $derived(`${isPast ? 'text-muted-foreground text-xs' : 'text-muted-foreground sm:mt-1 text-xs sm:text-sm font-medium'} mt-0.5 line-clamp-2 overflow-hidden text-ellipsis`);
</script>

<svelte:element this={isLink ? 'a' : 'div'} class={containerClass} href={isLink ? `/notice/${notice.slug || notice._id}` : undefined}>
	<div class="flex items-start justify-between gap-2 sm:gap-4">
		<div class="flex-1 min-w-0">
			<div class={headerGapClass}>
				<span class={typePillClass}>
					{notice.type}
				</span>
				<span class={subjectClass}>
					{notice.subject}
				</span>
			</div>
			<div class={titleWrapClass}>
				<h3 class={titleClass}>
					{notice.title}
				</h3>
				{#if notice.hasFiles}
					<svg class="w-3 h-3 text-muted-foreground flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
						<path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd"/>
					</svg>
				{/if}
			</div>
			{#if notice.summary}
				<p class={summaryClass}>
					{notice.summary}
				</p>
			{/if}
		</div>
		{#if isLink}
			<div class="text-muted-foreground text-sm mt-0.5 {isPast ? 'opacity-75' : ''}" aria-hidden="true">
				→
			</div>
		{/if}
	</div>
</svelte:element>