<script lang="ts">
import { useConvexClient } from 'convex-svelte';
import { api } from "@class-info/backend/convex/_generated/api";
import { writable } from 'svelte/store';
import { onMount } from 'svelte';
import { page } from '$app/stores';
import { goto } from '$app/navigation';
import { marked } from 'marked';

const notice = writable({ isLoading: true, error: undefined as any, data: null as any });

const client = useConvexClient();

onMount(async () => {
	const noticeId = $page.params.id;
	
	// Wait for client to initialize
	setTimeout(async () => {
		try {
			// Set up live subscription for real-time updates
			const unsubscribeNotice = client.onUpdate(api.notices.getById, { id: noticeId }, (noticeData) => {
				notice.set({ isLoading: false, error: undefined, data: noticeData });
			});

			// Clean up subscription when component unmounts
			return () => {
				unsubscribeNotice();
			};
		} catch (error) {
			notice.set({ isLoading: false, error, data: null });
		}
	}, 100);
});

function getTypeColor(type: string) {
	switch(type) {
		case '수행평가': return 'bg-[#3d3d3d] text-white';
		case '숙제': return 'bg-[#5c5c5c] text-white';
		case '준비물': return 'bg-[#888888] text-white';
		case '기타': return 'bg-[#b0b0b0] text-[#262626]';
		default: return 'bg-[#d1d1d1] text-[#262626]';
	}
}

function formatDate(dateString: string) {
	const date = new Date(dateString);
	const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
	const weekday = weekdays[date.getDay()];
	return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일 (${weekday})`;
}

function renderMarkdown(text: string) {
	// Convert single line breaks to double line breaks for proper markdown parsing
	let processedText = text
		.replace(/\r\n/g, '\n') // Normalize line endings
		.replace(/([^\n])\n([^\n])/g, '$1\n\n$2'); // Convert single newlines to double newlines
	
	// Convert YouTube links to embeds BEFORE markdown processing to avoid duplication
	processedText = processedText.replace(
		/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/g,
		'\n\n<div class="video-embed"><iframe src="https://www.youtube.com/embed/$1" frameborder="0" allowfullscreen></iframe></div>\n\n'
	);
	
	return marked(processedText);
}
</script>

<div class="min-h-screen bg-[#f6f6f6]">
	<div class="max-w-4xl mx-auto p-4">
		<!-- Header -->
		<div class="flex items-center mb-6 sm:mb-8 pb-3 sm:pb-4 border-b border-[#d1d1d1]">
			<button 
				on:click={() => goto('/')}
				class="mr-4 text-[#888888] hover:text-[#262626] transition-colors"
			>
				← 뒤로
			</button>
			<h1 class="text-lg sm:text-xl md:text-2xl font-bold text-[#262626]">알림 상세</h1>
		</div>

		<!-- Notice Detail -->
		{#if $notice.isLoading}
			<div class="text-center py-8 text-[#6d6d6d]">로딩 중...</div>
		{:else if $notice.error}
			<div class="text-center py-8 text-red-600">
				<p>데이터를 불러오는 중 오류가 발생했습니다.</p>
				<p class="text-sm mt-2">{$notice.error.toString()}</p>
				<button on:click={() => window.location.reload()} class="mt-4 px-4 py-2 bg-[#262626] text-white text-sm hover:bg-[#3d3d3d]">
					다시 시도
				</button>
			</div>
		{:else if !$notice.data}
			<div class="text-center py-8 text-[#6d6d6d]">알림을 찾을 수 없습니다.</div>
		{:else}
			<div class="bg-white border border-[#d1d1d1] p-4 sm:p-6">
				<div class="mb-4">
					<div class="flex items-center gap-2 sm:gap-3 mb-2">
						<span class="px-2 py-1 text-sm font-medium rounded {getTypeColor($notice.data.type)}">
							{$notice.data.type}
						</span>
						<span class="text-base sm:text-lg font-medium text-[#5c5c5c]">
							{$notice.data.subject}
						</span>
					</div>
					<h2 class="text-lg sm:text-xl md:text-2xl font-bold text-[#262626] mb-2">
						{$notice.data.title}
					</h2>
					<p class="text-sm sm:text-base text-[#888888]">
						마감일: {formatDate($notice.data.dueDate)}
					</p>
				</div>
				
				{#if $notice.data.description && $notice.data.description.trim()}
					<div class="border-t border-[#e0e0e0] pt-4">
						<div class="text-sm sm:text-base text-[#4f4f4f] leading-relaxed markdown-content">
							{@html renderMarkdown($notice.data.description)}
						</div>
					</div>
				{/if}

				{#if $notice.data.createdAt}
					<div class="border-t border-[#e0e0e0] pt-4 mt-6 text-xs sm:text-sm text-[#888888]">
						등록일: {new Date($notice.data.createdAt).toLocaleString('ko-KR', { 
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
</div>

<style>
.markdown-content :global(h1) {
	font-size: 1.25rem;
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
		font-size: 1.5rem;
	}
}

.markdown-content :global(h2),
.markdown-content :global(h3),
.markdown-content :global(h4),
.markdown-content :global(h5),
.markdown-content :global(h6) {
	font-size: 1rem;
	font-weight: bold;
	color: #262626;
	margin-top: 0.75rem;
	margin-bottom: 0.5rem;
}
.markdown-content :global(h2:first-child),
.markdown-content :global(h3:first-child),
.markdown-content :global(h4:first-child),
.markdown-content :global(h5:first-child),
.markdown-content :global(h6:first-child) {
	margin-top: 0;
}
@media (min-width: 640px) {
	.markdown-content :global(h2),
	.markdown-content :global(h3),
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