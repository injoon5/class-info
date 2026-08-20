<script lang="ts">
import { useQuery } from 'convex-svelte';
import { api } from "@class-info/backend/convex/_generated/api";
import NoticeGroup from './NoticeGroup.svelte';
import PastMonthDetails from './PastMonthDetails.svelte';
import LoadingState from '$lib/components/ui/LoadingState.svelte';
import ErrorState from '$lib/components/ui/ErrorState.svelte';
import EmptyState from '$lib/components/ui/EmptyState.svelte';
import NoticeFooter from './NoticeFooter.svelte';
import Disclosure from '$lib/components/ui/Disclosure.svelte';
import PageMeta from '$lib/components/PageMeta.svelte';
import { pageTitle } from '$lib/site';
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

<PageMeta
	title={pageTitle('공지')}
	description="수행평가, 숙제, 준비물 등 중요한 공지사항을 확인하세요."
	path="/notices"
/>


<div class="max-w-4xl mx-auto px-4 pt-5 pb-4 sm:pt-6">
	<h1 class="sr-only">공지</h1>
	<!-- Notice Board -->
    {#if overview.isLoading}
        <LoadingState />
    {:else if overview.error}
        <ErrorState error={overview.error} />
    {:else}
        <!-- Current notices only. Past-month groups still render below. -->
        {#if overview.data?.currentGroups && overview.data.currentGroups.length > 0}
            {#each overview.data.currentGroups as group (group.date)}
                <NoticeGroup {group} />
            {/each}
        {:else}
            <EmptyState message="공지가 없어요" />
        {/if}

        {#if overview.data?.pastMonths && overview.data.pastMonths.length > 0}
            <div class="mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-border">
                <h2 class="text-base sm:text-lg font-semibold mb-2 sm:mb-3 text-muted-foreground">지난 공지</h2>
                {#each overview.data.pastMonths as month (month.monthKey)}
                    <Disclosure
                        class="mb-1.5 sm:mb-2"
                        open={openMonthKey === month.monthKey}
                        label="{month.monthName} ({month.total}개)"
                        onToggle={() => (openMonthKey = openMonthKey === month.monthKey ? null : month.monthKey)}
                    >
                        <PastMonthDetails monthKey={month.monthKey} cutoff={data.cutoff} today={data.today} />
                    </Disclosure>
                {/each}
            </div>
        {/if}
    {/if}
    <NoticeFooter notices={overview.data?.currentGroups || []} />
</div>
