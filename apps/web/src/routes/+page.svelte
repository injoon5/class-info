<script lang="ts">
import { useConvexClient } from 'convex-svelte';
import { api } from "@class-info/backend/convex/_generated/api";
import { writable } from 'svelte/store';
import { onMount } from 'svelte';
import { groupNoticesByDate, groupPastNoticesByMonth } from '../lib/utils.js';
import NoticeGroup from '../components/NoticeGroup.svelte';
import PastNoticesSection from '../components/PastNoticesSection.svelte';
import LoadingState from '../components/LoadingState.svelte';
import ErrorState from '../components/ErrorState.svelte';
import EmptyState from '../components/EmptyState.svelte';
import NoticeFooter from '../components/NoticeFooter.svelte';

const notices = writable({ isLoading: true, error: undefined as any, data: [] as any[] });

const client = useConvexClient();

onMount(async () => {
	// Wait for client to initialize
	setTimeout(async () => {
		try {
			// Set up live subscriptions for real-time updates
			const unsubscribeNotices = client.onUpdate(api.notices.list, {}, (noticesData) => {
				notices.set({ isLoading: false, error: undefined, data: noticesData });
			});

			// Clean up subscriptions when component unmounts
			return () => {
				unsubscribeNotices();
			};
		} catch (error) {
			notices.set({ isLoading: false, error, data: [] });
		}
	}, 100);
});

$: allGroupedNotices = groupNoticesByDate($notices.data || []);
$: currentNotices = allGroupedNotices.filter(group => !group.isPast);
$: pastNotices = allGroupedNotices.filter(group => group.isPast);
$: pastNoticesByMonth = groupPastNoticesByMonth(pastNotices);

</script>

<svelte:head>
	<title>학급 공지 - 3학년 4반</title>
	<meta name="description" content="3학년 4반 학급 공지사항입니다. 수행평가, 숙제, 준비물 등 중요한 공지사항을 확인하세요." />
	
	<!-- Open Graph -->
	<meta property="og:title" content="학급 공지사항 - 3학년 4반" />
	<meta property="og:description" content="3학년 4반 학급 공지사항입니다. 수행평가, 숙제, 준비물 등 중요한 공지사항을 확인하세요." />
	<meta property="og:image" content="https://og.ij5.dev/api/og/?title=3%ED%95%99%EB%85%84%204%EB%B0%98%20%EA%B3%B5%EC%A7%80&subheading=timefor.school" />
	<meta property="og:url" content="https://timefor.school" />
	<meta property="og:type" content="website" />
	<meta property="og:site_name" content="학급 공지사항" />

	<!-- Twitter Card -->
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content="학급 공지사항 - 3학년 4반" />
	<meta name="twitter:description" content="3학년 4반 학급 공지사항입니다. 수행평가, 숙제, 준비물 등 중요한 공지사항을 확인하세요." />
	<meta name="twitter:image" content="https://og.ij5.dev/api/og/?title=3%ED%95%99%EB%85%84%204%EB%B0%98%20%EA%B3%B5%EC%A7%80&subheading=timefor.school" />
</svelte:head>

<div class="min-h-screen bg-neutral-100 dark:bg-neutral-900">
	<div class="max-w-4xl mx-auto p-4">
		<!-- Header -->
		<div class="flex justify-center items-center mb-6 sm:mb-8 pb-3 sm:pb-4 border-b border-neutral-300 dark:border-neutral-600">
			<h1 class="text-xl sm:text-2xl font-bold text-neutral-800 dark:text-neutral-200">3-4 공지사항</h1>
		</div>

		<!-- Notice Board -->
		{#if $notices.isLoading}
			<LoadingState />
		{:else if $notices.error}
			<ErrorState error={$notices.error} />
		{:else if allGroupedNotices.length === 0}
			<EmptyState />
		{:else}
			<!-- Current and Future Notices -->
			{#each currentNotices as group}
				<NoticeGroup {group} />
			{/each}

			<PastNoticesSection {pastNoticesByMonth} />
		{/if}
		
		<NoticeFooter notices={$notices.data} />
	</div>
</div>
