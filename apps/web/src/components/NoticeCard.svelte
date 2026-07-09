<script lang="ts">
import { getTypeColor } from '../lib/utils.js';

let { notice, isPast = false }: { notice: any; isPast?: boolean } = $props();

const isLink = $derived(Boolean((notice?.summary && String(notice.summary).trim()) || notice?.hasFiles));

const containerClass = $derived(
	`card block p-3 sm:p-3.5 ${isPast ? 'opacity-70' : ''}` +
	(isLink
		? ` pressable-xl transition-[background-color,transform] duration-150 hover:bg-neutral-50 dark:hover:bg-neutral-800${isPast ? ' hover:opacity-90' : ''}`
		: '')
);
</script>

<svelte:element this={isLink ? 'a' : 'div'} class={containerClass} href={isLink ? `/notice/${notice.slug || notice._id}` : undefined}>
	<div class="flex items-center justify-between gap-2 sm:gap-4">
		<div class="flex-1 min-w-0">
			<div class="flex items-center gap-1.5 sm:gap-2 mb-1">
				<span class="px-1.5 py-0.5 text-xs font-semibold rounded-md {getTypeColor(notice.type)}">
					{notice.type}
				</span>
				<span class="text-[13px] font-medium text-neutral-500 dark:text-neutral-400">
					{notice.subject}
				</span>
			</div>
			<div class="flex items-center gap-1.5">
				<h3 class="font-semibold tracking-[-0.01em] text-neutral-900 dark:text-neutral-100 {isPast ? 'text-sm' : 'text-[15px] sm:text-base'}">
					{notice.title}
				</h3>
				{#if notice.hasFiles}
					<svg class="w-3.5 h-3.5 text-neutral-400 dark:text-neutral-500 flex-shrink-0" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24" aria-label="첨부 파일 있음">
						<path stroke-linecap="round" stroke-linejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 119.5 7.372L8.552 8.32m.009-.01l-.01.01m5.699 9.941l7.693-7.693"/>
					</svg>
				{/if}
			</div>
			{#if notice.summary}
				<p class="text-neutral-500 dark:text-neutral-400 {isPast ? 'text-xs' : 'text-[13px] sm:text-sm'} mt-1 line-clamp-2 overflow-hidden text-ellipsis">
					{notice.summary}
				</p>
			{/if}
		</div>
		{#if isLink}
			<svg viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4 text-neutral-300 dark:text-neutral-600 flex-shrink-0" aria-hidden="true">
				<path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd"/>
			</svg>
		{/if}
	</div>
</svelte:element>
