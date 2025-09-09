<script lang="ts">
import { getTypeColor, getFirstLine } from '../lib/utils.js';

export let notice: any;
export let isPast = false;
</script>

{#if (notice.description && notice.description.trim()) || (notice.files && notice.files.length > 0)}
	<div class="{isPast ? 'bg-neutral-50 dark:bg-neutral-700 border-neutral-200 dark:border-neutral-700 opacity-75 hover:opacity-90 transition-opacity' : 'bg-white dark:bg-neutral-800 border-neutral-300 dark:border-neutral-600 hover:border-neutral-400 dark:hover:border-neutral-500 transition-colors'} border p-2 sm:p-3 cursor-pointer" on:click={() => window.location.href = `/notice/${notice._id}`}>
		<div class="flex items-start justify-between gap-2 sm:gap-4">
			<div class="flex-1">
				<div class="flex items-center gap-1.5 sm:gap-2 {isPast ? 'mb-0.5 sm:mb-1' : 'mb-1'}">
					<span class="px-1 py-0.5 {isPast ? '' : 'sm:py-1'} text-xs font-medium rounded {getTypeColor(notice.type)} {isPast ? 'opacity-75' : ''}">
						{notice.type}
					</span>
					<span class="text-xs {isPast ? 'font-medium text-neutral-500 dark:text-neutral-400' : 'sm:text-sm font-bold text-neutral-600 dark:text-neutral-300'}">
						{notice.subject}
					</span>
				</div>
				<div class="flex items-center gap-1.5 mb-0.5 {isPast ? '' : 'sm:mb-1'}">
					<h3 class="{isPast ? 'font-medium text-neutral-600 dark:text-neutral-300 text-xs sm:text-sm' : 'font-semibold text-neutral-800 dark:text-neutral-200 text-sm sm:text-base'}">
						{notice.title}
					</h3>
					{#if notice.files && notice.files.length > 0}
						<svg class="w-3 h-3 text-neutral-400 dark:text-neutral-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
							<path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd"/>
						</svg>
					{/if}
				</div>
				<p class="{isPast ? 'text-neutral-500 dark:text-neutral-400 text-xs' : 'text-neutral-600 dark:text-neutral-300 text-xs sm:text-sm'} line-clamp-2">
					{getFirstLine(notice.description)}
				</p>
			</div>
			<div class="text-neutral-400 dark:text-neutral-500 text-sm {isPast ? 'opacity-75' : ''}">
				→
			</div>
		</div>
	</div>
{:else}
	<div class="{isPast ? 'bg-neutral-50 dark:bg-neutral-700 border-neutral-200 dark:border-neutral-700 opacity-75' : 'bg-white dark:bg-neutral-800 border-neutral-300 dark:border-neutral-600'} border p-2 sm:p-3">
		<div class="flex items-start justify-between gap-2 sm:gap-4">
			<div class="flex-1">
				<div class="flex items-center gap-1.5 sm:gap-2 {isPast ? 'mb-0.5 sm:mb-1' : 'mb-1'}">
					<span class="px-1 py-0.5 {isPast ? '' : 'sm:py-1'} text-xs font-medium rounded {getTypeColor(notice.type)} {isPast ? 'opacity-75' : ''}">
						{notice.type}
					</span>
					<span class="text-xs {isPast ? 'font-medium text-neutral-500 dark:text-neutral-400' : 'sm:text-sm font-bold text-neutral-600 dark:text-neutral-300'}">
						{notice.subject}
					</span>
				</div>
				<div class="flex items-center gap-1.5 mb-0.5 {isPast ? '' : 'sm:mb-1'}">
					<h3 class="{isPast ? 'font-medium text-neutral-600 dark:text-neutral-300 text-xs sm:text-sm' : 'font-semibold text-neutral-800 dark:text-neutral-200 text-sm sm:text-base'}">
						{notice.title}
					</h3>
					{#if notice.files && notice.files.length > 0}
						<svg class="w-3 h-3 text-neutral-400 dark:text-neutral-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
							<path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd"/>
						</svg>
					{/if}
				</div>
			</div>
		</div>
	</div>
{/if}