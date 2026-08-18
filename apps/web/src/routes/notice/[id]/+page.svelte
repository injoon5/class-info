<script lang="ts">
import { useQuery } from 'convex-svelte';
import { api } from "@class-info/backend/convex/_generated/api";
import { page } from '$app/state';
import { getTypeColor, getFirstLine, formatDate, formatFileSize } from '../../../lib/utils.js';
import { renderMarkdown } from '$lib/markdown';
import { formatAbsolute } from '$lib/date';
import LoadingState from '../../../components/LoadingState.svelte';
import ErrorState from '../../../components/ErrorState.svelte';
import type { PageData } from './$types.js';

let { data }: { data: PageData } = $props();

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
		<!-- Header -->
		<a
			href="/notices"
			class="inline-flex items-center gap-1 sm:mb-3 mb-2 py-1 sm:py-2 text-sm text-muted-foreground pointer:hover:text-foreground transition-colors pressable"
		>
			← 뒤로
		</a>

		<!-- Notice Detail -->
		{#if detail.isLoading}
			<LoadingState />
		{:else if detail.error}
			<ErrorState error={detail.error} />
		{:else if !detail.data?.notice}
			<div class="text-center py-16 text-sm text-muted-foreground">공지를 찾을 수 없습니다</div>
		{:else}
			<div class="mb-4 mt-2 sm:mt-3 bg-card border border-border rounded-2xl p-4 sm:p-6">
				<div class="mb-4">
					<div class="flex items-center gap-2 sm:gap-3 mb-1.5 sm:mb-2">
						<span class="px-2 py-1 text-sm font-semibold rounded-md {getTypeColor(detail.data.notice.type)}">
							{detail.data.notice.type}
						</span>
						<span class="text-base sm:text-lg font-medium text-muted-foreground">
							{detail.data.notice.subject}
						</span>
					</div>
					<h1 class="text-xl sm:text-2xl font-bold tracking-tight text-foreground sm:mb-1">
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
							{#each detail.data.files as file}
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
											class="text-sm font-medium text-foreground pointer:hover:text-muted-foreground underline break-all"
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
										class="shrink-0 px-4 py-2 text-sm border border-border pointer:hover:bg-muted text-foreground font-semibold inline-flex items-center justify-center rounded-lg pressable transition-colors"
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
		<a href="/admin" class="pressable inline-block rounded-full px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors pointer:hover:text-foreground pointer:hover:bg-muted">
			관리자
		</a>
	</div>
</div>

<style>
.markdown-content :global(h1) {
	font-size: 1.5rem;
	font-weight: bold;
	margin-top: 1rem;
	margin-bottom: 0.5rem;
}
.markdown-content :global(h1:first-child) {
	margin-top: 0;
}
@media (min-width: 640px) {
	.markdown-content :global(h1) {
		font-size: 1.75rem;
	}
}

.markdown-content :global(h2) {
	font-size: 1.25rem;
	font-weight: bold;
	margin-top: 0.75rem;
	margin-bottom: 0.5rem;
}
.markdown-content :global(h2:first-child) {
	margin-top: 0;
}
@media (min-width: 640px) {
	.markdown-content :global(h2) {
		font-size: 1.5rem;

	}
}

.markdown-content :global(h3) {
	font-size: 1.125rem;
	font-weight: bold;
	margin-top: 0.75rem;
	margin-bottom: 0.5rem;
}
.markdown-content :global(h3:first-child) {
	margin-top: 0;
}
@media (min-width: 640px) {
	.markdown-content :global(h3) {
		font-size: 1.25rem;
	}
}

.markdown-content :global(h4),
.markdown-content :global(h5),
.markdown-content :global(h6) {
	font-size: 1rem;
	font-weight: bold;
	margin-top: 0.75rem;
	margin-bottom: 0.5rem;
}
.markdown-content :global(h4:first-child),
.markdown-content :global(h5:first-child),
.markdown-content :global(h6:first-child) {
	margin-top: 0;
}
@media (min-width: 640px) {
	.markdown-content :global(h4),
	.markdown-content :global(h5),
	.markdown-content :global(h6) {
		font-size: 1.125rem;
	}
}

.markdown-content :global(p) {
	margin-bottom: 0.75rem;
}
.markdown-content :global(p:last-child) {
	margin-bottom: 0;
}

.markdown-content :global(ul) {
	margin-bottom: 0.75rem;
	padding-left: 1.5rem;
	list-style-type: disc;
}

.markdown-content :global(ol) {
	margin-bottom: 0.75rem;
	padding-left: 1.5rem;
	list-style-type: decimal;
}

.markdown-content :global(li) {
	margin-bottom: 0.25rem;
	display: list-item;
}

.markdown-content :global(strong) {
	font-weight: bold;
}

.markdown-content :global(em) {
	font-style: italic;
}

.markdown-content :global(code) {
	padding: 0.125rem 0.25rem;
	font-size: 0.75rem;
	font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
	border-radius: 0.25rem;
}
@media (min-width: 640px) {
	.markdown-content :global(code) {
		font-size: 0.875rem;
	}
}

.markdown-content :global(pre) {
	padding: 0.75rem;
	border-radius: 0.5rem;
	margin-bottom: 0.75rem;
	overflow-x: auto;
}

.markdown-content :global(pre code) {
	background-color: transparent;
	padding: 0;
}

.markdown-content :global(blockquote) {
	border-left-width: 3px;
	border-left-style: solid;
	padding-left: 0.75rem;
	font-style: italic;
	margin-bottom: 0.75rem;
}

.markdown-content :global(a) {
	text-decoration: underline;
}

.markdown-content :global(img) {
	max-width: 100%;
	height: auto;
	border-radius: 0.5rem;
	margin: 0.75rem 0;
	box-shadow: 0 0 0 1px oklch(0 0 0 / 0.1);
}
:global(.dark) .markdown-content :global(img) {
	box-shadow: 0 0 0 1px oklch(1 0 0 / 0.1);
}

.markdown-content :global(.video-embed) {
	position: relative;
	width: 100%;
	height: 0;
	padding-bottom: 56.25%; /* 16:9 aspect ratio */
	margin: 0.75rem 0;
	border-radius: 0.25rem;
	overflow: hidden;
	box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.markdown-content :global(.video-embed iframe) {
	position: absolute;
	top: 0;
	left: 0;
	width: 100%;
	height: 100%;
	border: none;
}

.markdown-content :global(hr) {
	border: none;
	border-top: 1px solid var(--border);
	margin: 1.5rem 0;
}
</style>