<script lang="ts">
import { useQuery } from 'convex-svelte';
import { api } from "@class-info/backend/convex/_generated/api";
import { page } from '$app/state';
import { noticeTypeClass } from '$lib/notices';
import { getFirstLine, renderMarkdown } from '$lib/markdown';
import { formatAbsolute, formatDate } from '$lib/date';
import { formatFileSize } from '$lib/format';
import LoadingState from '$lib/components/ui/LoadingState.svelte';
import PillButton from '$lib/components/ui/PillButton.svelte';
import ErrorState from '$lib/components/ui/ErrorState.svelte';
import type { PageData } from './$types.js';

const { data }: { data: PageData } = $props();

const detail = useQuery(
	api.notices.detail,
	() => ({ id: page.params.id ?? '' }),
	() => ({ 
		initialData: { notice: data.notice, files: data.files },
		keepPreviousData: true 
	})
);

let html = $state<string | null>(data.prerenderedHtml || null);

$effect(() => {
	const description = detail.data?.notice?.description;
	if (!description) return;
	const run = () => { html = renderMarkdown(description); };
	// Lazy render markdown when idle
	if (typeof requestIdleCallback !== 'undefined') requestIdleCallback(run);
	else setTimeout(run, 0);
});
</script>

<svelte:head>
	{#if detail.data?.notice}
		<title>{detail.data.notice.subject} {detail.data.notice.title} | 1-3 학급 공지</title>
		<meta name="description" content="{getFirstLine(detail.data.notice.description) || '공지 내용을 확인하세요!'}" />

		<!-- Open Graph -->
		<meta property="og:title" content="{detail.data.notice.subject} {detail.data.notice.title} | 1-3 학급 공지" />
		<meta property="og:description" content="{getFirstLine(detail.data.notice.description) || '공지 내용을 확인하세요!'}" />
		<meta property="og:type" content="article" />
		<meta property="og:site_name" content="TimeforSchool" />

		<!-- Twitter Card -->
		<meta name="twitter:card" content="summary_large_image" />
		<meta name="twitter:title" content="{detail.data.notice.subject} {detail.data.notice.title} | 1-3 학급 공지" />
		<meta name="twitter:description" content="{getFirstLine(detail.data.notice.description) || '공지 내용을 확인하세요!'}" />
	{:else}
		<title>공지 상세 - 1-3 학급 공지</title>
		<meta name="description" content="학급 공지의 상세 내용을 확인하세요." />
		<meta property="og:title" content="공지 상세 - 학급 공지" />
		<meta property="og:description" content="학급 공지의 상세 내용을 확인하세요." />
	{/if}
</svelte:head>


<div class="min-h-screen">
	<div class="max-w-4xl mx-auto px-4 pt-4 pb-2">
		<a
			href="/notices"
			class="touch-target pressable mb-2.5 inline-flex w-fit items-center rounded-full border border-border bg-card py-1.5 pl-2.5 pr-3 text-sm leading-tight text-muted-foreground transition-colors duration-150 pointer:hover:bg-muted pointer:hover:text-foreground"
		>
			← 뒤로
		</a>

		<!-- Notice Detail -->
		{#if detail.isLoading}
			<LoadingState />
		{:else if detail.error}
			<ErrorState error={detail.error} />
		{:else if !detail.data?.notice}
			<div class="text-center py-16 text-sm text-muted-foreground">공지를 찾을 수 없어요</div>
		{:else}
			<div class="mb-4 bg-card border border-border rounded-3xl p-4 sm:p-6">
				<div class="mb-4">
					<div class="flex items-center gap-2 sm:gap-3 mb-1.5 sm:mb-2">
						<span class="inline-flex rounded-[9px] border border-border p-[3px]">
							<span class="rounded-md px-2 py-1 text-sm font-semibold {noticeTypeClass(detail.data.notice.type)}">
								{detail.data.notice.type}
							</span>
						</span>
						<span class="text-base sm:text-lg text-muted-foreground">
							{detail.data.notice.subject}
						</span>
					</div>
					<h1 class="text-xl sm:text-2xl font-bold sm:tracking-tight text-foreground sm:mb-1">
						{detail.data.notice.title}
					</h1>
					<p class="text-sm sm:text-base text-muted-foreground">
						마감일: {formatDate(detail.data.notice.dueDate)}
					</p>
				</div>

				{#if html}
					<div class="border-t border-border pt-4">
						<div class="text-sm sm:text-base leading-relaxed markdown-content break-words max-w-[42rem]">
							{@html html}
						</div>
					</div>
				{/if}

				{#if detail.data.files && detail.data.files.length > 0}
					<div class="border-t border-border pt-4 mt-6">
						<h2 class="text-sm sm:text-base font-semibold mb-3 text-foreground">첨부 파일</h2>
						<div class="space-y-2">
							{#each detail.data.files as file (file.url)}
								<div class="flex items-center gap-3 p-3 bg-muted/50 border border-border rounded-lg">
									<div class="flex-shrink-0">
										{#if file.type.startsWith('image/')}
											<svg class="w-5 h-5 text-muted-foreground" fill="currentColor" viewBox="0 0 20 20">
												<path fill-rule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clip-rule="evenodd"/>
											</svg>
										{:else}
											<svg class="w-5 h-5 text-muted-foreground" fill="currentColor" viewBox="0 0 20 20">
												<path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clip-rule="evenodd"/>
											</svg>
										{/if}
									</div>
									<div class="flex-1 min-w-0">
										<a
											href={file.url}
											target="_blank"
											rel="noopener noreferrer"
											class="text-sm font-semibold text-foreground pointer:hover:text-muted-foreground underline break-all"
										>
											{file.name}
										</a>
										<p class="text-xs text-muted-foreground tabular-nums">
											{formatFileSize(file.size)}
										</p>
									</div>
									<a
										href={file.url}
										target="_blank"
										role="button"
										rel="noopener noreferrer"
										class="shrink-0 px-4 py-2 text-sm border border-border pointer:hover:bg-muted text-foreground font-semibold inline-flex items-center justify-center rounded-lg pressable transition-colors duration-150"
										data-s-event="Open File"
									>
										열기
									</a>
								</div>
							{/each}
						</div>
					</div>
				{/if}

				{#if detail.data.notice.createdAt}
					<div class="border-t border-border pt-4 mt-6 text-xs sm:text-sm text-muted-foreground">
						등록일: {formatAbsolute(detail.data.notice.createdAt)}
					</div>
				{/if}
			</div>
		{/if}
	</div>
	<div class="text-center py-4">
		<PillButton href="/admin" text="관리자" variant="ghost" size="sm" />
	</div>
</div>
