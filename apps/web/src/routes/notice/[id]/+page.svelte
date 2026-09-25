<script lang="ts">
import { useQuery } from 'convex-svelte';
import { api } from '@class-info/backend/convex/_generated/api';
import { summarizeDescription } from '@class-info/backend/convex/text';
import { CLASS_LABEL } from '@class-info/backend/convex/config';
import { page } from '$app/state';
import { noticeTypeClass } from '$lib/notices';
import { renderMarkdown } from '$lib/markdown';
import { formatAbsolute, formatDate } from '$lib/date';
import { formatFileSize } from '$lib/format';
import PageMeta from '$lib/components/PageMeta.svelte';
import FileIcon from '$lib/components/ui/FileIcon.svelte';
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

const notice = $derived(detail.data?.notice ?? null);
const files = $derived(detail.data?.files ?? []);

// Server-rendered first; re-rendered when idle after a live edit.
let html = $state<string | null>(data.prerenderedHtml || null);

$effect(() => {
	const description = notice?.description;
	if (!description) {
		if (notice) html = null;
		return;
	}
	const run = () => {
		html = renderMarkdown(description);
	};
	if (typeof requestIdleCallback !== 'undefined') requestIdleCallback(run);
	else setTimeout(run, 0);
});
</script>

{#if notice}
	<PageMeta
		title="{notice.subject} {notice.title} | {CLASS_LABEL} 공지"
		description={summarizeDescription(notice.description) || '공지 내용을 확인하세요!'}
		path="/notice/{notice.slug || notice._id}"
		type="article"
	/>
{:else}
	<PageMeta title="공지 상세 - {CLASS_LABEL} 공지" description="학급 공지의 상세 내용을 확인하세요." />
{/if}

<div class="min-h-screen">
	<div class="max-w-4xl mx-auto px-4 pt-4 pb-2">
		<a
			href="/notices"
			class="touch-target pressable mb-2.5 inline-flex w-fit items-center rounded-full border border-border bg-card py-1.5 pl-2.5 pr-3 text-sm leading-tight text-muted-foreground transition-colors duration-150 pointer:hover:bg-muted pointer:hover:text-foreground"
		>
			← 뒤로
		</a>

		{#if detail.isLoading}
			<LoadingState />
		{:else if detail.error}
			<ErrorState error={detail.error} />
		{:else if !notice}
			<div class="text-center py-16 text-sm text-muted-foreground">공지를 찾을 수 없어요</div>
		{:else}
			<article class="mb-4 bg-card border border-border rounded-3xl sm:rounded-[2rem] p-4 sm:p-6">
				<header class="mb-4">
					<div class="flex items-center gap-2 sm:gap-3 mb-1.5 sm:mb-2">
						<!-- Concentric with the card: its radius less one padding step. -->
						<span class="inline-flex rounded-lg px-2 py-1 text-sm font-semibold {noticeTypeClass(notice.type)}">
							{notice.type}
						</span>
						<span class="text-base sm:text-lg text-muted-foreground">{notice.subject}</span>
					</div>
					<h1 class="text-xl sm:text-2xl font-bold sm:tracking-tight text-foreground sm:mb-1">
						{notice.title}
					</h1>
					<p class="text-sm sm:text-base text-muted-foreground">
						마감일: {formatDate(notice.dueDate)}
					</p>
				</header>

				{#if html}
					<div class="border-t border-border pt-4">
						<div class="text-sm sm:text-base leading-relaxed markdown-content break-words max-w-[42rem]">
							{@html html}
						</div>
					</div>
				{/if}

				{#if files.length > 0}
					<div class="border-t border-border pt-4 mt-6">
						<h2 class="text-sm sm:text-base font-semibold mb-3 text-foreground">첨부 파일</h2>
						<ul class="space-y-2">
							{#each files as file (file.url)}
								<li class="flex items-center gap-3 p-3 bg-muted/50 border border-border rounded-lg">
									<FileIcon mime={file.type} class="w-5 h-5 shrink-0 text-muted-foreground" />
									<div class="flex-1 min-w-0">
										<a
											href={file.url}
											target="_blank"
											rel="noopener noreferrer"
											class="text-sm font-semibold text-foreground pointer:hover:text-muted-foreground underline break-all"
										>
											{file.name}
										</a>
										<p class="text-xs text-muted-foreground tabular-nums">{formatFileSize(file.size)}</p>
									</div>
									<a
										href={file.url}
										target="_blank"
										rel="noopener noreferrer"
										class="shrink-0 px-4 py-2 text-sm border border-border pointer:hover:bg-muted text-foreground font-semibold inline-flex items-center justify-center rounded-lg pressable transition-colors duration-150"
										data-s-event="Open File"
									>
										열기
									</a>
								</li>
							{/each}
						</ul>
					</div>
				{/if}

				{#if notice.createdAt}
					<footer class="border-t border-border pt-4 mt-6 text-xs sm:text-sm text-muted-foreground">
						등록일: {formatAbsolute(notice.createdAt)}
					</footer>
				{/if}
			</article>
		{/if}
	</div>
	<div class="text-center py-4">
		<PillButton href="/admin" text="관리자" variant="ghost" size="sm" />
	</div>
</div>
