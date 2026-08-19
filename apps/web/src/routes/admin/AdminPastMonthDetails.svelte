<script lang="ts">
import { useQuery } from 'convex-svelte';
import { api } from "@class-info/backend/convex/_generated/api";
import type { Id } from "@class-info/backend/convex/_generated/dataModel";
import { noticeTypeClass } from '$lib/notices';
import type { Snippet } from 'svelte';
import { SvelteSet } from 'svelte/reactivity';
import { fade, slide } from 'svelte/transition';
import { flip } from 'svelte/animate';
import { fadeFast, flipMove, slideNone, slideY, slideYOut } from '$lib/transitions';
import ConfirmDeleteActions from '$lib/components/ui/ConfirmDeleteActions.svelte';
import LoadingState from '$lib/components/ui/LoadingState.svelte';
import FluidHeight from '$lib/components/ui/FluidHeight.svelte';

// `editorTarget` and `editor` come from the admin page so a past notice is
// edited in its own row too, not somewhere else on the page.
const {
    monthKey,
    cutoff,
    today,
    onEdit,
    onDelete,
    editorTarget = null,
    editor,
    dismissedIds = new SvelteSet<string>()
}: {
    monthKey: string;
    cutoff: string;
    today: string;
    onEdit: (id: Id<'notices'>) => void;
    onDelete: (id: Id<'notices'>) => void;
    editorTarget?: string | null;
    editor?: Snippet;
    dismissedIds?: Set<string>;
} = $props();

// Cheap destructive action: confirmed in the row, not in a modal.
let confirmingDeleteId = $state<string | null>(null);

const groups = useQuery(
    api.notices.pastByMonth,
    () => ({ monthKey, cutoff, today })
);
// First ready paint is silent so FluidHeight can tween spinner → full list
// instead of measuring mid-slide. Later row/group intros still slide.
let listLive = $state(false);
$effect(() => {
	if (groups.isLoading || groups.error) {
		listLive = false;
		return;
	}
	const frame = requestAnimationFrame(() => {
		listLive = true;
	});
	return () => cancelAnimationFrame(frame);
});
const listSlide = $derived(listLive ? slideY : slideNone);

const visibleGroups = $derived(
    (groups.data ?? [])
        .map((g) => ({
            ...g,
            notices: (g.notices ?? []).filter((n) => !dismissedIds.has(String(n._id)))
        }))
        .filter((g) => g.notices.length > 0)
);

</script>

<div class="px-3 pb-3 pt-1">
    <FluidHeight key={groups.isLoading ? 'loading' : groups.error ? 'error' : 'ready'}>
    {#if groups.isLoading}
        <LoadingState compact />
    {:else if groups.error}
        <div class="text-sm text-destructive py-3 text-center">오류가 발생했습니다.</div>
    {:else}
        <div in:fade={fadeFast}>
        {#each visibleGroups as group (group.date)}
            <div
                class="mb-3 last:mb-0"
                animate:flip={flipMove}
                in:slide={listSlide}
                out:slide={slideYOut}
            >
                <h3 class="text-sm font-semibold mb-2 text-muted-foreground border-l-2 border-border pl-2">
                    {group.displayDate}
                </h3>
                <div class="grid gap-2">
                    {#each group.notices as notice (notice._id)}
                        <div
                            animate:flip={flipMove}
                            in:slide={listSlide}
                            out:slide={slideYOut}
                        >
                        {#if editor && editorTarget === String(notice._id)}
                            {@render editor()}
                        {:else}
                        <div class="bg-muted/40 border border-border rounded-xl p-3 overflow-hidden">
                            <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                                <div class="flex-1 min-w-0">
                                    <div class="flex items-center gap-2 mb-1">
                                        <span class="px-1.5 py-0.5 text-xs font-semibold rounded-md opacity-90 {noticeTypeClass(notice.type)}">
                                            {notice.type}
                                        </span>
                                        <span class="text-xs text-muted-foreground">
                                            {notice.subject}
                                        </span>
                                    </div>
                                    <div class="flex items-center gap-1.5 mb-0.5">
                                        <h4 class="text-muted-foreground text-sm truncate">
                                            {notice.title}
                                        </h4>
                                    </div>
                                </div>
                                <ConfirmDeleteActions
                                    size="sm"
                                    confirming={confirmingDeleteId === String(notice._id)}
                                    onEdit={() => onEdit(notice._id)}
                                    onAskDelete={() => (confirmingDeleteId = String(notice._id))}
                                    onConfirmDelete={() => {
                                        onDelete(notice._id);
                                        confirmingDeleteId = null;
                                    }}
                                    onCancel={() => (confirmingDeleteId = null)}
                                />
                            </div>
                        </div>
                        {/if}
                        </div>
                    {/each}
                </div>
            </div>
        {/each}
        </div>
    {/if}
    </FluidHeight>
</div>
