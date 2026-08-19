<script lang="ts">
import { useQuery } from 'convex-svelte';
import { api } from "@class-info/backend/convex/_generated/api";
import { getTypeColor } from '../lib/utils.js';
import type { Snippet } from 'svelte';

// `editorTarget` and `editor` come from the admin page so a past notice is
// edited in its own row too, not somewhere else on the page.
const {
    monthKey,
    cutoff,
    today,
    onEdit,
    onDelete,
    editorTarget = null,
    editor
}: {
    monthKey: string;
    cutoff: string;
    today: string;
    onEdit: (id: string) => void;
    onDelete: (id: string) => void;
    editorTarget?: string | null;
    editor?: Snippet;
} = $props();

// Cheap destructive action: confirmed in the row, not in a modal.
let confirmingDeleteId = $state<string | null>(null);

const groups = useQuery(
    api.notices.pastByMonth,
    () => ({ monthKey, cutoff, today })
);

</script>

<div class="px-3 pb-3 pt-1">
    {#if groups.isLoading}
        <div class="text-sm text-muted-foreground">불러오는 중…</div>
    {:else if groups.error}
        <div class="text-sm text-destructive">오류가 발생했습니다.</div>
    {:else}
        {#each groups.data ?? [] as group (group.date)}
            <div class="mb-3 last:mb-0">
                <h3 class="text-sm font-semibold mb-2 text-muted-foreground border-l-2 border-border pl-2">
                    {group.displayDate}
                </h3>
                <div class="grid gap-2">
                    {#each group.notices as notice (notice._id)}
                        {#if editor && editorTarget === String(notice._id)}
                            {@render editor()}
                        {:else}
                        <div class="bg-muted/40 border border-border rounded-xl p-3 overflow-hidden">
                            <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                                <div class="flex-1 min-w-0">
                                    <div class="flex items-center gap-2 mb-1">
                                        <span class="px-1.5 py-0.5 text-xs font-semibold rounded-md opacity-90 {getTypeColor(notice.type)}">
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
                                <div class="flex gap-1.5">
                                    {#if confirmingDeleteId === String(notice._id)}
                                        <button
                                            onclick={() => { onDelete(String(notice._id)); confirmingDeleteId = null; }}
                                            class="pressable touch-target rounded-lg px-2.5 py-1 text-xs font-semibold border border-destructive bg-destructive/10 text-destructive transition-colors duration-150 pointer:hover:bg-destructive/20"
                                        >삭제</button>
                                        <button
                                            onclick={() => (confirmingDeleteId = null)}
                                            class="pressable touch-target rounded-lg px-2.5 py-1 text-xs font-semibold border border-border text-muted-foreground transition-colors duration-150 pointer:hover:bg-muted pointer:hover:text-foreground"
                                        >취소</button>
                                    {:else}
                                        <button
                                            onclick={() => onEdit(String(notice._id))}
                                            class="pressable touch-target rounded-lg px-2.5 py-1 text-xs font-semibold border border-border text-foreground transition-colors duration-150 pointer:hover:bg-muted"
                                        >수정</button>
                                        <button
                                            onclick={() => (confirmingDeleteId = String(notice._id))}
                                            class="pressable touch-target rounded-lg px-2.5 py-1 text-xs font-semibold border border-border text-destructive transition-colors duration-150 pointer:hover:bg-destructive/10"
                                        >삭제</button>
                                    {/if}
                                </div>
                            </div>
                        </div>
                        {/if}
                    {/each}
                </div>
            </div>
        {/each}
    {/if}
</div>


