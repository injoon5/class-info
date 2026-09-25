<script lang="ts" module>
import type { Id } from '@class-info/backend/convex/_generated/dataModel';
import type { MinimalNotice } from '$lib/notices';

export type NoticeForm = {
	title: string;
	subject: string;
	type: MinimalNotice['type'];
	description: string;
	dueDate: string;
	files: Id<'files'>[];
};

export function emptyNoticeForm(): NoticeForm {
	return { title: '', subject: '', type: '숙제', description: '', dueDate: '', files: [] };
}
</script>

<script lang="ts">
import { fade, slide } from 'svelte/transition';
import { autosize } from '$lib/actions/autosize';
import { holdComposingEnter } from '$lib/dom';
import { fadeOut, reveal, slideY, slideYOut } from '$lib/transitions';
import PillButton from '$lib/components/ui/PillButton.svelte';
import FileUpload from './FileUpload.svelte';

let {
	form = $bindable(),
	isEditing,
	isSubmitting,
	error,
	sessionToken,
	onsubmit,
	oncancel,
	onUploaded
}: {
	form: NoticeForm;
	isEditing: boolean;
	isSubmitting: boolean;
	error: string | null;
	sessionToken: string;
	onsubmit: () => void;
	oncancel: () => void;
	onUploaded: (fileIds: Id<'files'>[]) => void;
} = $props();

const noticeTypes = ['수행평가', '숙제', '준비물', '기타'] as const;
</script>

<div id="notice-editor" in:slide={slideY} out:slide={slideYOut}>
	<div class="bg-card border border-border rounded-3xl p-4 mb-6" in:reveal out:fade={fadeOut}>
		<h2 class="text-lg font-semibold mb-4 text-foreground">{isEditing ? '공지 수정' : '새 공지 추가'}</h2>

		<form
			class="grid gap-4"
			onsubmit={(e) => {
				e.preventDefault();
				onsubmit();
			}}
		>
			<div>
				<label for="notice-title" class="block text-sm font-semibold mb-1.5 text-muted-foreground">제목 *</label>
				<input
					id="notice-title"
					type="text"
					bind:value={form.title}
					onkeydown={holdComposingEnter}
					class="field"
					placeholder="예: 수학 과제 제출"
				/>
			</div>

			<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
				<div>
					<label for="notice-subject" class="block text-sm font-semibold mb-1.5 text-muted-foreground">과목 *</label>
					<input
						id="notice-subject"
						type="text"
						bind:value={form.subject}
						onkeydown={holdComposingEnter}
						class="field"
						placeholder="예: 수학"
					/>
				</div>

				<div>
					<label for="notice-type" class="block text-sm font-semibold mb-1.5 text-muted-foreground">종류 *</label>
					<div class="relative">
						<select id="notice-type" bind:value={form.type} class="field pr-10 appearance-none">
							{#each noticeTypes as type (type)}
								<option value={type}>{type}</option>
							{/each}
						</select>
						<svg
							viewBox="0 0 20 20"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							class="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
							aria-hidden="true"
						>
							<path stroke-linecap="round" stroke-linejoin="round" d="M5 7.5l5 5 5-5" />
						</svg>
					</div>
				</div>
			</div>

			<div class="min-w-0 overflow-hidden">
				<label for="notice-date" class="block text-sm font-semibold mb-1.5 text-muted-foreground">마감일 *</label>
				<input id="notice-date" type="date" bind:value={form.dueDate} class="field date-input" />
			</div>

			<div>
				<label for="notice-description" class="block text-sm font-semibold mb-1.5 text-muted-foreground">
					설명 (마크다운 지원)
				</label>
				<textarea
					id="notice-description"
					bind:value={form.description}
					use:autosize={form.description}
					rows="8"
					class="field h-auto py-2.5 font-mono resize-none break-words overflow-hidden"
					placeholder="상세 설명 또는 준비물 목록&#10;&#10;마크다운 사용 가능:&#10;**굵게** *기울임* `코드`&#10;# 제목 ## 부제목&#10;- 목록 항목&#10;> 인용구&#10;![이미지](URL)&#10;유튜브 링크는 자동 변환됩니다"
				></textarea>
				<p class="text-xs text-muted-foreground mt-1.5">마크다운 문법을 사용할 수 있습니다. 상세 페이지에서 형식화되어 표시됩니다.</p>
			</div>

			<div>
				<div class="text-sm font-semibold mb-1.5 text-muted-foreground">파일 첨부</div>
				<FileUpload files={form.files} onFilesChange={(files) => (form.files = files)} {onUploaded} {sessionToken} />
			</div>

			{#if error}
				<p class="text-sm font-semibold text-destructive" role="alert">{error}</p>
			{/if}

			<div class="flex gap-2">
				<PillButton
					type="submit"
					morph
					text={isSubmitting ? '저장 중…' : isEditing ? '수정' : '추가'}
					pending={isSubmitting}
					disabled={isSubmitting}
					class="px-5 py-2.5"
				/>
				<PillButton type="button" text="취소" variant="secondary" onclick={oncancel} disabled={isSubmitting} class="px-5 py-2.5" />
			</div>
		</form>
	</div>
</div>
