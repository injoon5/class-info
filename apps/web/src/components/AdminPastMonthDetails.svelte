<script lang="ts">
import { useQuery } from 'convex-svelte';
import { api } from "@class-info/backend/convex/_generated/api";
import { getTypeColor } from '../lib/utils.js';

let { monthKey, onEdit, onDelete }: { monthKey: string; onEdit: (id: string) => void; onDelete: (id: string) => void } = $props();

const groups = useQuery(api.notices.pastByMonth, { monthKey });

</script>

<div class="px-4 pb-4 py-2">
    {#if groups.isLoading}
        <div class="text-sm text-muted-foreground">불러오는 중…</div>
    {:else if groups.error}
        <div class="text-sm text-destructive">오류가 발생했습니다.</div>
    {:else}
        {#each groups.data as group}
            <div class="mb-3 last:mb-0">
                <h4 class="text-sm font-medium mb-2 text-muted-foreground border-l-2 border-border pl-2">
                    {group.displayDate}
                </h4>
                <div class="grid gap-2">
                    {#each group.notices as notice}
                        <div class="bg-muted/40 border border-border rounded-xl p-3 overflow-hidden">
                            <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                                <div class="flex-1 min-w-0">
                                    <div class="flex items-center gap-2 mb-1">
                                        <span class="px-1.5 py-0.5 text-xs font-medium rounded-md opacity-90 {getTypeColor(notice.type)}">
                                            {notice.type}
                                        </span>
                                        <span class="text-xs font-medium text-muted-foreground">
                                            {notice.subject}
                                        </span>
                                    </div>
                                    <div class="flex items-center gap-1.5 mb-0.5">
                                        <h5 class="font-medium text-muted-foreground text-sm truncate">
                                            {notice.title}
                                        </h5>
                                    </div>
                                </div>
                                <div class="flex gap-1.5">
                                    <button
                                        onclick={() => onEdit(String(notice._id))}
                                        class="pressable rounded-lg px-2.5 py-1 text-xs font-medium border border-border text-foreground transition-colors pointer:hover:bg-muted"
                                    >수정</button>
                                    <button
                                        onclick={() => onDelete(String(notice._id))}
                                        class="pressable rounded-lg px-2.5 py-1 text-xs font-medium border border-border text-destructive transition-colors pointer:hover:bg-destructive/10"
                                    >삭제</button>
                                </div>
                            </div>
                        </div>
                    {/each}
                </div>
            </div>
        {/each}
    {/if}
</div>


