<script lang="ts">
import { useQuery } from 'convex-svelte';
import { api } from "@class-info/backend/convex/_generated/api";
import NoticeGroup from '../../components/NoticeGroup.svelte';
import PastMonthDetails from '../../components/PastMonthDetails.svelte';
import LoadingState from '../../components/LoadingState.svelte';
import ErrorState from '../../components/ErrorState.svelte';
import EmptyState from '../../components/EmptyState.svelte';
import NoticeFooter from '../../components/NoticeFooter.svelte';
import type { PageData } from './$types.js';

let { data }: { data: PageData } = $props();
let openMonthKey = $state<string | null>(null);

const overview = useQuery(api.notices.overview, {}, () => ({
    initialData: data,
    keepPreviousData: true,
}));
</script>

<svelte:head>
	<title>공지 - 1학년 3반</title>
	<meta name="description" content="수행평가, 숙제, 준비물 등 중요한 공지사항을 확인하세요." />

	<!-- Open Graph -->
	<meta property="og:title" content="공지 - 1학년 3반" />
	<meta property="og:description" content="수행평가, 숙제, 준비물 등 중요한 공지사항을 확인하세요." />
	<meta property="og:url" content="https://timefor.school/notices" />
	<meta property="og:type" content="website" />
	<meta property="og:site_name" content="TimeforSchool" />

	<!-- Twitter Card -->
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content="공지 - 1학년 3반" />
	<meta name="twitter:description" content="수행평가, 숙제, 준비물 등 중요한 공지사항을 확인하세요." />
</svelte:head>


<div class="max-w-4xl mx-auto p-4">
	<!-- Notice Board -->
    {#if overview.isLoading}
        <LoadingState />
    {:else if overview.error}
        <ErrorState error={overview.error} />
    {:else}
        <!-- Current and Future Notices -->
        {#if overview.data?.currentGroups && overview.data.currentGroups.length > 0}
            {#each overview.data.currentGroups as group}
                <NoticeGroup {group} />
            {/each}
        {:else}
            <EmptyState />
        {/if}

        {#if overview.data?.pastMonths && overview.data.pastMonths.length > 0}
            <div class="mt-8 sm:mt-10 pt-6 border-t border-[var(--separator)]">
                <h2 class="text-[17px] font-semibold tracking-[-0.01em] mb-3 text-neutral-500 dark:text-neutral-400 px-0.5">지난 알림</h2>
                {#each overview.data.pastMonths as month (month.monthKey)}
                    {@const isOpen = openMonthKey === month.monthKey}
                    <details class="card mb-2 overflow-hidden" open={isOpen}>
                        <summary
                            class="list-none [&::-webkit-details-marker]:hidden flex items-center justify-between px-3.5 sm:px-4 py-3 cursor-pointer select-none
                                hover:bg-neutral-950/[0.03] dark:hover:bg-white/[0.04] active:bg-neutral-950/[0.05] dark:active:bg-white/[0.06] transition-colors duration-100
                                text-neutral-600 dark:text-neutral-300 font-medium text-sm sm:text-[15px]"
                            onclick={(e) => {
                                e.preventDefault();
                                openMonthKey = isOpen ? null : month.monthKey;
                            }}
                        >
                            <span>{month.monthName} <span class="text-neutral-400 dark:text-neutral-500">· {month.total}개</span></span>
                            <svg viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4 text-neutral-400 dark:text-neutral-500 transition-transform duration-200 ease-spring {isOpen ? 'rotate-90' : ''}" aria-hidden="true">
                                <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd"/>
                            </svg>
                        </summary>
                        {#if isOpen}
                            {#key month.monthKey}
                                <PastMonthDetails monthKey={month.monthKey} />
                            {/key}
                        {/if}
                    </details>
                {/each}
            </div>
        {/if}
        {#if (!overview.data?.currentGroups || overview.data.currentGroups.length === 0) && (!overview.data?.pastMonths || overview.data.pastMonths.length === 0)}
            <EmptyState />
        {/if}
    {/if}
    <NoticeFooter notices={overview.data?.currentGroups || []} />
</div>
