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
		<title>{detail.data.notice.subject} {detail.data.notice.title} | 3-4 학급 공지</title>
		<meta name="description" content="{getFirstLine(detail.data.notice.description) || '공지 내용을 확인하세요!'}" />
		
		<!-- Open Graph -->
		<meta property="og:title" content="{detail.data.notice.subject} {detail.data.notice.title} | 3-4 학급 공지" />
		<meta property="og:description" content="{getFirstLine(detail.data.notice.description) || '공지 내용을 확인하세요!'}" />
		<meta property="og:type" content="article" />
		<meta property="og:site_name" content="학급 공지" />
		
		<!-- Twitter Card -->
		<meta name="twitter:card" content="summary_large_image" />
		<meta name="twitter:title" content="{detail.data.notice.subject} {detail.data.notice.title} | 3-4 학급 공지" />
		<meta name="twitter:description" content="{getFirstLine(detail.data.notice.description) || '공지 내용을 확인하세요!'}" />
	{:else}
		<title>공지 상세 - 3-4 학급 공지</title>
		<meta name="description" content="학급 공지의 상세 내용을 확인하세요." />
		<meta property="og:title" content="공지 상세 - 학급 공지" />
		<meta property="og:description" content="학급 공지의 상세 내용을 확인하세요." />
	{/if}
</svelte:head>


<div class="min-h-screen bg-neutral-100 dark:bg-neutral-900">
	<div class="max-w-4xl mx-auto px-4">
		<!-- Header -->
		<a
			type="button"
			href="/"
			class="sm:mb-3 mb-2 py-1 sm:py-2 text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 transition-colors"
		>
			← 뒤로
		</a>

		<!-- Notice Detail -->
		{#if detail.isLoading}
			<div class="text-center py-8 text-neutral-500 dark:text-neutral-400">로딩 중...</div>
		{:else if detail.error}
			<div class="text-center py-8 text-red-600">
				<p>데이터를 불러오는 중 오류가 발생했습니다.</p>
				<p class="text-sm mt-2">{detail.error.toString()}</p>
				<button onclick={() => window.location.reload()} class="mt-4 px-4 py-2 bg-neutral-800 dark:bg-neutral-300 text-white dark:text-neutral-800 text-sm hover:bg-neutral-700 dark:hover:bg-neutral-200">
					다시 시도
				</button>
			</div>
		{:else if !detail.data?.notice}
			<div class="text-center py-8 text-neutral-500 dark:text-neutral-400">알림을 찾을 수 없습니다.</div>
		{:else}
			<div class="mb-4 mt-2 sm:mt-3 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-600 p-4 sm:p-6">
				<div class="mb-4">
					<div class="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-2">
						<span class="px-2 py-1 text-sm font-medium rounded {getTypeColor(detail.data.notice.type)}">
							{detail.data.notice.type}
						</span>
						<span class="text-base sm:text-lg font-medium text-neutral-600 dark:text-neutral-300">
							{detail.data.notice.subject}
						</span>
					</div>
					<h2 class="text-xl sm:text-2xl font-bold text-neutral-800 dark:text-neutral-200 sm:mb-1">
						{detail.data.notice.title}
					</h2>
					<p class="text-sm sm:text-base text-neutral-500 dark:text-neutral-400">
						마감일: {formatDate(detail.data.notice.dueDate)}
					</p>
				</div>
				
				{#if html}
					<div class="border-t border-neutral-200 dark:border-neutral-700 pt-4">
						<div class="text-sm sm:text-base text-neutral-600 dark:text-neutral-300 leading-relaxed markdown-content break-words">
							{@html html.replaceAll('<img ', '<img loading="lazy" ')}
						</div>
					</div>
				{/if}

				{#if detail.data.files && detail.data.files.length > 0}
					<div class="border-t border-neutral-200 dark:border-neutral-700 pt-4 mt-6">
						<h3 class="text-sm sm:text-base font-medium mb-3 text-neutral-600 dark:text-neutral-300">첨부 파일</h3>
						<div class="space-y-2">
							{#each detail.data.files as file}
								<div class="flex items-center gap-3 p-3 bg-neutral-50 dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600">
									<div class="flex-shrink-0">
										{#if file.type.startsWith('image/')}
											<svg class="w-5 h-5 text-neutral-500" fill="currentColor" viewBox="0 0 20 20">
												<path fill-rule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clip-rule="evenodd"/>
											</svg>
										{:else}
											<svg class="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
												<path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clip-rule="evenodd"/>
											</svg>
										{/if}
									</div>
									<div class="flex-1">
										<a 
											href={file.url} 
											target="_blank" 
											rel="noopener noreferrer"
											class="text-sm font-medium text-neutral-800 dark:text-neutral-200 hover:text-neutral-600 dark:hover:text-neutral-300 underline"
										>
											{file.name}
										</a>
										<p class="text-xs text-neutral-500 dark:text-neutral-400">
											{(file.size / 1024 / 1024).toFixed(2)} MB
										</p>
									</div>
									<a
										href={file.url}
										target="_blank"
										role="button"
										rel="noopener noreferrer"
										class="px-5 py-2 text-sm border border-neutral-300 dark:border-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-600 text-neutral-600 dark:text-neutral-300 font-semibold inline-flex items-center justify-center"
									>
										열기
									</a>
								</div>
							{/each}
						</div>
					</div>
				{/if}

				{#if detail.data.notice.createdAt}
					<div class="border-t border-neutral-200 dark:border-neutral-700 pt-4 mt-6 text-xs sm:text-sm text-neutral-500 dark:text-neutral-400">
						등록일: {new Date(detail.data.notice.createdAt).toLocaleString('ko-KR', { 
							year: 'numeric', 
							month: 'long', 
							day: 'numeric', 
							hour: '2-digit', 
							minute: '2-digit' 
						})}
					</div>
				{/if}
			</div>
		{/if}
	</div>
	<div class="text-center py-3 sm:py-4 text-xs text-neutral-500 dark:text-neutral-400 space-y-1.5 sm:space-y-2">
		<div>
			<a href="/admin" class="text-xs text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 underline">
				관리자
			</a>
		</div>
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
	border-radius: 0.25rem;
	margin: 0.75rem 0;
	box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
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
	border-top: 1px solid #e0e0e0;
	margin: 1.5rem 0;
}
</style>