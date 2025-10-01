<script lang="ts">
import { useQuery } from 'convex-svelte';
import { api } from "@class-info/backend/convex/_generated/api";
import NoticeGroup from '../components/NoticeGroup.svelte';
import PastMonthDetails from '../components/PastMonthDetails.svelte';
import LoadingState from '../components/LoadingState.svelte';
import ErrorState from '../components/ErrorState.svelte';
import EmptyState from '../components/EmptyState.svelte';
import NoticeFooter from '../components/NoticeFooter.svelte';
import type { PageData } from './$types.js';

let { data }: { data: PageData } = $props();
let openMonthKey = $state<string | null>(null);

$effect(() => {
    console.debug('[notices] openMonthKey changed:', openMonthKey);
});

const overview = useQuery(api.notices.overview, {}, () => ({
    initialData: data,
    keepPreviousData: true,
}));

</script>

<svelte:head>
	<title>학급 공지 - 3학년 4반</title>
	<meta name="description" content="3학년 4반 학급 공지사항입니다. 수행평가, 숙제, 준비물 등 중요한 공지사항을 확인하세요." />

	<!-- Open Graph -->
	<meta property="og:title" content="학급 공지사항 - 3학년 4반" />
	<meta property="og:description" content="3학년 4반 학급 공지사항입니다. 수행평가, 숙제, 준비물 등 중요한 공지사항을 확인하세요." />
	<meta property="og:url" content="https://timefor.school" />
	<meta property="og:type" content="website" />
	<meta property="og:site_name" content="학급 공지사항" />

	<!-- Twitter Card -->
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content="학급 공지사항 - 3학년 4반" />
	<meta name="twitter:description" content="3학년 4반 학급 공지사항입니다. 수행평가, 숙제, 준비물 등 중요한 공지사항을 확인하세요." />
</svelte:head>


<div class="max-w-4xl mx-auto p-4 ios-content-padding">
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
            <div class="mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-neutral-200 dark:border-neutral-700">
                <h2 class="text-base sm:text-lg font-medium mb-1 sm:mb-2 text-neutral-500 dark:text-neutral-400">지난 알림</h2>
                {#each overview.data.pastMonths as month (month.monthKey)}
                    <details class="mb-1.5 sm:mb-2 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded" open={openMonthKey === month.monthKey}>
                        <summary 
                            class="rounded-t px-3 sm:px-4 py-2 sm:p-3 cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-700 text-neutral-500 dark:text-neutral-400 font-medium text-sm sm:text-base"
                            onclick={(e) => {
                                e.preventDefault();
                                openMonthKey = openMonthKey === month.monthKey ? null : month.monthKey;
                            }}
                        >
                            {month.monthName} ({month.total}개)
                        </summary>
                        {#if openMonthKey === month.monthKey}
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

