<script lang="ts">
import type { Id } from '@class-info/backend/convex/_generated/dataModel';
import { noticeTypeClass, type MinimalNotice } from '$lib/notices';
import ConfirmDeleteActions from '$lib/components/ui/ConfirmDeleteActions.svelte';
import FileIcon from '$lib/components/ui/FileIcon.svelte';

const {
	notice,
	past = false,
	confirming,
	onEdit,
	onAskDelete,
	onDelete,
	onCancel
}: {
	notice: MinimalNotice;
	past?: boolean;
	confirming: boolean;
	onEdit: (id: Id<'notices'>) => void;
	onAskDelete: (id: Id<'notices'>) => void;
	onDelete: (id: Id<'notices'>) => void;
	onCancel: () => void;
} = $props();
</script>

<div class={['border border-border rounded-xl p-3 overflow-hidden', past ? 'bg-muted/40' : 'bg-card']}>
	<div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
		<div class="flex-1 min-w-0">
			<div class="flex items-center gap-1.5 sm:gap-2 mb-1">
				<span
					class={[
						'px-1.5 py-0.5 font-semibold rounded-md',
						past ? 'text-xs opacity-90' : 'text-xs sm:text-sm',
						noticeTypeClass(notice.type)
					]}
				>
					{notice.type}
				</span>
				<span class={past ? 'text-xs text-muted-foreground' : 'text-sm font-semibold text-muted-foreground'}>
					{notice.subject}
				</span>
			</div>
			<div class="flex items-center gap-1.5 mb-0.5 sm:mb-1">
				{#if past}
					<h4 class="text-muted-foreground text-sm truncate">{notice.title}</h4>
				{:else}
					<h3 class="font-semibold text-foreground text-base break-words">{notice.title}</h3>
				{/if}
				{#if notice.hasFiles}
					<FileIcon attachment class="w-3 h-3 text-muted-foreground shrink-0" />
				{/if}
			</div>
			{#if !past && notice.summary}
				<p class="text-muted-foreground text-xs sm:text-sm line-clamp-2 break-all">{notice.summary}</p>
			{/if}
		</div>
		<ConfirmDeleteActions
			size={past ? 'sm' : 'md'}
			{confirming}
			onEdit={() => onEdit(notice._id)}
			onAskDelete={() => onAskDelete(notice._id)}
			onConfirmDelete={() => onDelete(notice._id)}
			{onCancel}
		/>
	</div>
</div>
