<script lang="ts">
import { slide } from 'svelte/transition';
import { expoOut } from 'svelte/easing';
import { useQuery } from 'convex-svelte';
import { api } from "@class-info/backend/convex/_generated/api";
import NoticeGroup from '../../components/NoticeGroup.svelte';
import PastMonthDetails from '../../components/PastMonthDetails.svelte';
import LoadingState from '../../components/LoadingState.svelte';
import ErrorState from '../../components/ErrorState.svelte';
import EmptyState from '../../components/EmptyState.svelte';
import NoticeFooter from '../../components/NoticeFooter.svelte';
import type { PageData } from './$types.js';

const { data }: { data: PageData } = $props();
let openMonthKey = $state<string | null>(null);

const overview = useQuery(
    api.notices.overview,
    () => ({ cutoff: data.cutoff, today: data.today }),
    () => ({
        initialData: { currentGroups: data.currentGroups, pastMonths: data.pastMonths },
        keepPreviousData: true,
    })
);
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


<div class="max-w-4xl mx-auto px-4 pt-5 pb-4 sm:pt-6">
	<h1 class="sr-only">공지</h1>
	<!-- Notice Board -->
    {#if overview.isLoading}
        <LoadingState />
    {:else if overview.error}
        <ErrorState error={overview.error} />
    {:else}
        <!-- Current and Future Notices -->
        {#if overview.data?.currentGroups && overview.data.currentGroups.length > 0}
            {#each overview.data.currentGroups as group (group.date)}
                <NoticeGroup {group} />
            {/each}
        {/if}

        {#if overview.data?.pastMonths && overview.data.pastMonths.length > 0}
            <div class="mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-border">
                <h2 class="text-base sm:text-lg font-semibold mb-2 sm:mb-3 text-muted-foreground">지난 공지</h2>
                {#each overview.data.pastMonths as month (month.monthKey)}
                    <details class="mb-1.5 sm:mb-2 bg-card border border-border rounded-3xl overflow-hidden" open={openMonthKey === month.monthKey}>
                        <summary
                            class="touch-target flex items-center gap-2 px-3 sm:px-4 py-2.5 sm:py-3 cursor-pointer list-none transition-colors duration-150 pointer:hover:bg-muted text-muted-foreground font-semibold text-sm sm:text-base [&::-webkit-details-marker]:hidden"
                            onclick={(e) => {
                                e.preventDefault();
                                openMonthKey = openMonthKey === month.monthKey ? null : month.monthKey;
                            }}
                        >
                            <svg
                                viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2"
                                class="w-4 h-4 flex-shrink-0 text-muted-foreground transition-[rotate] duration-200 ease-out-expo {openMonthKey === month.monthKey ? 'rotate-90' : ''}"
                                aria-hidden="true"
                            >
                                <path stroke-linecap="round" stroke-linejoin="round" d="M7.5 4.5l5 5.5-5 5.5"/>
                            </svg>
                            {month.monthName} ({month.total}개)
                        </summary>
                        {#if openMonthKey === month.monthKey}
                            <div transition:slide={{ duration: 300, easing: expoOut }}>
                                {#key month.monthKey}
                                    <PastMonthDetails monthKey={month.monthKey} cutoff={data.cutoff} today={data.today} />
                                {/key}
                            </div>
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
