<script lang="ts">
import { useQuery } from 'convex-svelte';
import { api } from "@class-info/backend/convex/_generated/api";
import { getTypeColor } from '../lib/utils.js';

let { monthKey, onEdit, onDelete }: { monthKey: string; onEdit: (id: string) => void; onDelete: (id: string) => void } = $props();

const groups = useQuery(api.notices.pastByMonth, { monthKey });

</script>

<div class="px-4 pb-4 py-2">
    {#if groups.isLoading}
        <div class="text-sm text-neutral-400 dark:text-neutral-500">불러오는 중…</div>
    {:else if groups.error}
        <div class="text-sm text-red-500">오류가 발생했습니다.</div>
    {:else}
        {#each groups.data as group}
            <div class="mb-3 last:mb-0">
                <h4 class="text-sm font-medium mb-2 text-neutral-500 dark:text-neutral-400 border-l-2 border-neutral-300 dark:border-neutral-600 pl-2">
                    {group.displayDate}
                </h4>
                <div class="grid gap-2">
                    {#each group.notices as notice}
                        <div class="bg-neutral-50 dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-700 p-3 opacity-75 overflow-hidden">
                            <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                                <div class="flex-1 min-w-0">
                                    <div class="flex items-center gap-2 mb-1">
                                        <span class="px-1.5 py-0.5 text-xs font-medium rounded opacity-75 ${getTypeColor(notice.type)}">
                                            {notice.type}
                                        </span>
                                        <span class="text-xs font-medium text-neutral-500 dark:text-neutral-400">
                                            {notice.subject}
                                        </span>
                                    </div>
                                    <div class="flex items-center gap-1.5 mb-0.5">
                                        <h5 class="font-medium text-neutral-600 dark:text-neutral-300 text-sm truncate">
                                            {notice.title}
                                        </h5>
                                    </div>
                                </div>
                                <div class="flex gap-1">
                                    <button 
                                        onclick={() => onEdit(String(notice._id))}
                                        class="px-2 py-1 pressable text-xs border border-neutral-300 dark:border-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-600 text-neutral-600 dark:text-neutral-300 opacity-75"
                                    >수정</button>
                                    <button 
                                        onclick={() => onDelete(String(notice._id))}
                                        class="px-2 py-1 pressable text-xs bg-neutral-600 dark:bg-neutral-400 text-white hover:bg-neutral-700 dark:hover:bg-neutral-300 opacity-75"
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


