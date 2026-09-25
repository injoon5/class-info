<script lang="ts">
import { noticeTypeClass, type MinimalNotice } from '$lib/notices';
import FileIcon from '$lib/components/ui/FileIcon.svelte';

const {
	notice,
	isPast = false,
	interactive = true
}: { notice: MinimalNotice; isPast?: boolean; interactive?: boolean } = $props();

// A notice with nothing past its title has no page worth opening.
const isLink = $derived(interactive && Boolean(notice.summary.trim() || notice.hasFiles));
</script>

<svelte:element
	this={isLink ? 'a' : 'div'}
	href={isLink ? `/notice/${notice.slug || notice._id}` : undefined}
	class={[
		'block border border-border rounded-xl p-2.5 sm:p-3',
		isPast ? 'bg-card/60 opacity-80' : 'bg-card',
		isLink && 'pressable-xl',
		isLink && (isPast
			? 'transition-opacity duration-150 pointer:hover:opacity-100'
			: 'transition-colors duration-150 pointer:hover:border-muted-foreground/40')
	]}
>
	<div class="flex items-start justify-between gap-2 sm:gap-4">
		<div class="flex-1 min-w-0">
			<div class="flex items-center gap-1.5 sm:gap-2 mb-0.5 sm:mb-1">
				<span
					class={[
						'px-1.5 py-0.5 font-semibold rounded-md',
						isPast ? 'text-xs opacity-75' : 'text-xs sm:text-sm',
						noticeTypeClass(notice.type)
					]}
				>
					{notice.type}
				</span>
				<span class={isPast ? 'text-xs text-muted-foreground' : 'text-sm font-semibold text-muted-foreground'}>
					{notice.subject}
				</span>
			</div>
			<div class="flex items-center gap-1.5">
				<h3 class={isPast ? 'text-muted-foreground text-xs sm:text-sm' : 'font-semibold text-foreground text-list sm:text-base'}>
					{notice.title}
				</h3>
				{#if notice.hasFiles}
					<FileIcon attachment class="w-3 h-3 text-muted-foreground shrink-0" />
				{/if}
			</div>
			{#if notice.summary}
				<p class={['mt-0.5 line-clamp-2 text-muted-foreground', isPast ? 'text-xs' : 'text-xs sm:text-sm sm:mt-1']}>
					{notice.summary}
				</p>
			{/if}
		</div>
		{#if isLink}
			<div class={['text-muted-foreground text-sm mt-0.5', isPast && 'opacity-75']} aria-hidden="true">→</div>
		{/if}
	</div>
</svelte:element>
