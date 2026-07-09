<script lang="ts">
import { useQuery } from 'convex-svelte';
import { api } from "@class-info/backend/convex/_generated/api";
import { page } from '$app/stores';
import { goto } from '$app/navigation';
import { getTypeColor, getFirstLine, formatDate, truncateTitle, formatKoreanDueDate } from '../../../lib/utils.js';
import { marked } from 'marked';
import type { PageData } from './$types.js';

let { data }: { data: PageData } = $props();

const detail = useQuery(
	(api as any).notices.detail,
	() => ({ id: $page.params.id }),
	() => ({ 
		initialData: { notice: data.notice, files: data.files },
		keepPreviousData: true 
	})
);

let html = $state<string | null>(data.prerenderedHtml || null);

function renderMarkdown(text: string) {
	// Convert single line breaks to double line breaks for proper markdown parsing
	let processedText = text
		.replace(/\r\n/g, '\n') // Normalize line endings
		.replace(/([^\n])\n([^\n])/g, '$1\n\n$2'); // Convert single newlines to double newlines
	
	// Convert YouTube links to embeds BEFORE markdown processing to avoid duplication
	processedText = processedText.replace(
		/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})(?:[&?]t=(\d+)s?)?/g,
		(match, videoId, timestamp) => {
			const startParam = timestamp ? `?start=${timestamp}` : '';
			return `\n\n<div class="video-embed"><iframe src="https://www.youtube.com/embed/${videoId}${startParam}" frameborder="0" allowfullscreen></iframe></div>\n\n`;
		}
	);
	
	return marked.parse(processedText);
}

$effect(() => {
	if (detail.data?.notice?.description) {
		const run = async () => {
			const result = renderMarkdown(detail.data!.notice!.description);
			html = typeof result === 'string' ? result : await result;
		};
		// Lazy render markdown when idle
		if (typeof requestIdleCallback !== 'undefined') requestIdleCallback(run);
		else setTimeout(run, 0);
	}
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
	<div class="max-w-4xl mx-auto px-4 pt-3 sm:pt-4 pb-4">
		<!-- Back link -->
		<a
			href="/notices"
			class="pressable group inline-flex items-center gap-0.5 -ml-1.5 px-1.5 py-1.5 rounded-lg text-[15px] font-medium text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200 transition-colors duration-150"
		>
			<svg viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4 transition-transform duration-200 ease-out group-hover:-translate-x-0.5" aria-hidden="true">
				<path fill-rule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clip-rule="evenodd"/>
			</svg>
			공지
		</a>

		<!-- Notice Detail -->
		{#if detail.isLoading}
			<div class="flex justify-center py-20" role="status" aria-label="불러오는 중">
				<div class="spinner"></div>
			</div>
		{:else if detail.error}
			<div class="flex flex-col items-center py-20 text-center">
				<p class="text-[15px] font-medium text-neutral-800 dark:text-neutral-200">데이터를 불러오지 못했습니다</p>
				<p class="text-sm text-neutral-500 dark:text-neutral-400 mt-1">{detail.error.toString()}</p>
				<button onclick={() => window.location.reload()} class="pressable mt-5 px-5 py-2.5 rounded-full bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 text-sm font-semibold hover:opacity-90 transition-opacity">
					다시 시도
				</button>
			</div>
		{:else if !detail.data?.notice}
			<div class="text-center py-20 text-[15px] text-neutral-500 dark:text-neutral-400">알림을 찾을 수 없습니다</div>
		{:else}
			<article class="card mt-2 sm:mt-3 p-4 sm:p-7">
				<header class="mb-5">
					<div class="flex items-center gap-2 mb-2">
						<span class="px-2 py-0.5 text-[13px] font-semibold rounded-md {getTypeColor(detail.data.notice.type)}">
							{detail.data.notice.type}
						</span>
						<span class="text-[15px] font-medium text-neutral-500 dark:text-neutral-400">
							{detail.data.notice.subject}
						</span>
					</div>
					<h2 class="text-2xl sm:text-[1.75rem] leading-tight font-bold tracking-[-0.02em] text-neutral-900 dark:text-neutral-100 mb-1.5">
						{detail.data.notice.title}
					</h2>
					<p class="text-sm sm:text-[15px] text-neutral-500 dark:text-neutral-400">
						마감일: {formatDate(detail.data.notice.dueDate)}
					</p>
				</header>

				{#if html}
					<div class="border-t border-[var(--separator)] pt-5">
						<div class="text-[15px] sm:text-base text-neutral-700 dark:text-neutral-300 leading-relaxed markdown-content break-words">
							{@html html.replaceAll('<img ', '<img loading="lazy" ')}
						</div>
					</div>
				{/if}

				{#if detail.data.files && detail.data.files.length > 0}
					<div class="border-t border-[var(--separator)] pt-5 mt-6">
						<h3 class="text-[13px] font-semibold uppercase tracking-wide mb-3 text-neutral-400 dark:text-neutral-500">첨부 파일</h3>
						<div class="space-y-2">
							{#each detail.data.files as file}
								<div class="flex items-center gap-3 p-3 bg-neutral-950/[0.03] dark:bg-white/[0.04] rounded-xl">
									<div class="flex-shrink-0 w-9 h-9 rounded-lg bg-white dark:bg-white/[0.08] border border-[var(--separator)] flex items-center justify-center">
										{#if file.type.startsWith('image/')}
											<svg class="w-4.5 h-4.5 text-neutral-500 dark:text-neutral-400" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
												<path fill-rule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clip-rule="evenodd"/>
											</svg>
										{:else}
											<svg class="w-4.5 h-4.5 text-red-500 dark:text-red-400" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
												<path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clip-rule="evenodd"/>
											</svg>
										{/if}
									</div>
									<div class="flex-1 min-w-0">
										<a
											href={file.url}
											target="_blank"
											rel="noopener noreferrer"
											class="block text-sm font-medium text-neutral-900 dark:text-neutral-100 hover:opacity-70 transition-opacity truncate"
										>
											{file.name}
										</a>
										<p class="text-xs tabular-nums text-neutral-400 dark:text-neutral-500 mt-0.5">
											{(file.size / 1024 / 1024).toFixed(2)} MB
										</p>
									</div>
									<a
										href={file.url}
										target="_blank"
										role="button"
										rel="noopener noreferrer"
										class="pressable px-4 py-2 text-[13px] font-semibold rounded-full bg-white dark:bg-white/[0.08] border border-[var(--separator)] text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-white/[0.12] inline-flex items-center justify-center transition-colors duration-150"
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
					<div class="border-t border-[var(--separator)] pt-4 mt-6 text-xs sm:text-[13px] text-neutral-400 dark:text-neutral-500">
						등록일: {new Date(detail.data.notice.createdAt).toLocaleString('ko-KR', {
							year: 'numeric',
							month: 'long',
							day: 'numeric',
							hour: '2-digit',
							minute: '2-digit'
						})}
					</div>
				{/if}
			</article>
		{/if}
	</div>
	<div class="flex justify-center pb-6">
		<a href="/admin" class="pressable px-3 py-1.5 rounded-full text-xs font-medium text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200 hover:bg-neutral-950/[0.04] dark:hover:bg-white/[0.06] transition-colors duration-150">
			관리자
		</a>
	</div>
</div>

<style>
.markdown-content :global(h1) {
	font-size: 1.5rem;
	font-weight: bold;
	color: #262626;
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
	color: #262626;
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
	color: #262626;
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
	color: #262626;
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
	color: #262626;
}

.markdown-content :global(em) {
	font-style: italic;
}

.markdown-content :global(code) {
	background-color: #f0f0f0;
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
	background-color: #f5f5f5;
	padding: 0.75rem;
	border-radius: 0.25rem;
	margin-bottom: 0.75rem;
	overflow-x: auto;
}

.markdown-content :global(pre code) {
	background-color: transparent;
	padding: 0;
}

.markdown-content :global(blockquote) {
	border-left: 4px solid #d1d1d1;
	padding-left: 0.75rem;
	color: #666666;
	font-style: italic;
	margin-bottom: 0.75rem;
}

.markdown-content :global(a) {
	color: #3d3d3d;
	text-decoration: underline;
}
.markdown-content :global(a:hover) {
	color: #262626;
}

.markdown-content :global(img) {
	max-width: 100%;
	height: auto;
	border-radius: 0.75rem;
	margin: 0.75rem 0;
	box-shadow: 0 0 0 1px var(--separator);
}

.markdown-content :global(.video-embed) {
	position: relative;
	width: 100%;
	height: 0;
	padding-bottom: 56.25%; /* 16:9 aspect ratio */
	margin: 0.75rem 0;
	border-radius: 0.75rem;
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
	border-top: 1px solid #e0e0e0;
	margin: 1.5rem 0;
}
</style>