<script lang="ts">
import { useQuery } from 'convex-svelte';
import { api } from "@class-info/backend/convex/_generated/api";
import { groupNoticesByDate, groupPastNoticesByMonth } from '../lib/utils.js';
import NoticeGroup from '../components/NoticeGroup.svelte';
import PastNoticesSection from '../components/PastNoticesSection.svelte';
import LoadingState from '../components/LoadingState.svelte';
import ErrorState from '../components/ErrorState.svelte';
import EmptyState from '../components/EmptyState.svelte';
import NoticeFooter from '../components/NoticeFooter.svelte';
import type { PageData } from './$types.js';

let { data }: { data: PageData } = $props();

const notices = useQuery(
	api.notices.list,
	{},
	() => ({ 
		initialData: data.notices,
		keepPreviousData: true 
	})
);

const allGroupedNotices = $derived(groupNoticesByDate(notices.data || []));
const currentNotices = $derived(allGroupedNotices.filter(group => !group.isPast));
const pastNotices = $derived(allGroupedNotices.filter(group => group.isPast));
const pastNoticesByMonth = $derived(groupPastNoticesByMonth(pastNotices));

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
	{#if notices.isLoading}
		<LoadingState />
	{:else if notices.error}
		<ErrorState error={notices.error} />
	{:else if allGroupedNotices.length === 0}
		<EmptyState />
	{:else}
		<!-- Current and Future Notices -->
		{#each currentNotices as group}
			<NoticeGroup {group} />
		{/each}

		<PastNoticesSection {pastNoticesByMonth} />
	{/if}
	<NoticeFooter notices={notices.data || []} />
</div>

