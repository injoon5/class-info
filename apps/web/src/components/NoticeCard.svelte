<script lang="ts">
import { getTypeColor, getFirstLine } from '../lib/utils.js';

export let notice: any;
export let isPast = false;
</script>

{#if notice.description && notice.description.trim()}
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
				<h3 class="{isPast ? 'font-medium text-neutral-600 dark:text-neutral-300 text-xs sm:text-sm' : 'font-semibold text-neutral-800 dark:text-neutral-200 text-sm sm:text-base'} mb-0.5 {isPast ? '' : 'sm:mb-1'}">
					{notice.title}
				</h3>
				<p class="{isPast ? 'text-neutral-500 dark:text-neutral-400 text-xs' : 'text-neutral-600 dark:text-neutral-300 text-xs sm:text-sm'} truncate">
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
				<h3 class="{isPast ? 'font-medium text-neutral-600 dark:text-neutral-300 text-xs sm:text-sm' : 'font-semibold text-neutral-800 dark:text-neutral-200 text-sm sm:text-base'} mb-0.5 {isPast ? '' : 'sm:mb-1'}">
					{notice.title}
				</h3>
			</div>
		</div>
	</div>
{/if}