<script lang="ts">
import { getTypeColor } from '../lib/utils.js';

let { notice, isPast = false }: { notice: any; isPast?: boolean } = $props();

const isLink = $derived(Boolean((notice?.summary && String(notice.summary).trim()) || notice?.hasFiles));
console.log(isLink)
const containerClass = $derived(
    `${isPast ? 'bg-neutral-50 dark:bg-neutral-700 border-neutral-200 dark:border-neutral-700 opacity-75' : 'bg-white dark:bg-neutral-800 border-neutral-300 dark:border-neutral-600'} border p-2 sm:p-3 pressable-xl ${isLink ? (isPast ? 'hover:opacity-90 transition-opacity' : 'hover:border-neutral-400 dark:hover:border-neutral-500 transition-colors') : ''}`
);
const headerGapClass = $derived(`flex items-center gap-1.5 sm:gap-2 ${isPast ? 'mb-0.5 sm:mb-1' : 'mb-0.5 sm:mb-1'}`);
const typePillClass = $derived(`px-1.5 py-0.5  ${isPast ? 'text-xs' : 'text-sm'}  font-semibold rounded ${getTypeColor(notice.type)} ${isPast ? 'opacity-75' : ''}`);
const subjectClass = $derived(`${isPast ? 'text-xs font-medium text-neutral-500 dark:text-neutral-400' : 'text-sm font-semibold text-neutral-600 dark:text-neutral-300'}`);
const titleWrapClass = $derived(`flex items-center gap-1.5`);
const titleClass = $derived(`${isPast ? 'font-medium text-neutral-600 dark:text-neutral-300 text-xs sm:text-sm' : 'font-semibold text-neutral-800 dark:text-neutral-200 text-base sm:text-md'}`);
// Add overflow-hidden and break-words to prevent overflow
const summaryClass = $derived(`${isPast ? 'text-neutral-500 dark:text-neutral-400 text-xs' : 'text-neutral-600 sm:mt-1 dark:text-neutral-300 text-xs sm:text-sm font-medium'} mt-0.5 line-clamp-2 overflow-hidden text-ellipsis break-all`);
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
					<svg class="w-3 h-3 text-neutral-400 dark:text-neutral-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
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
			<div class="text-neutral-400 dark:text-neutral-500 text-sm {isPast ? 'opacity-75' : ''}">
				→
			</div>
		{/if}
	</div>
</svelte:element>