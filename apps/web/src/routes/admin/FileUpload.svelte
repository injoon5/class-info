<script lang="ts">
import { useConvexClient } from 'convex-svelte';
import { fly } from 'svelte/transition';
import { api } from '@class-info/backend/convex/_generated/api';
import type { Id } from '@class-info/backend/convex/_generated/dataModel';
import type { FileDoc } from '@class-info/backend/convex/validators';
import { flyHelper, flyHelperOut } from '$lib/transitions';
import { formatFileSize } from '$lib/format';
import FileIcon from '$lib/components/ui/FileIcon.svelte';
import PillButton from '$lib/components/ui/PillButton.svelte';
import Spinner from '$lib/components/ui/Spinner.svelte';

const {
	files = [],
	onFilesChange,
	onUploaded,
	sessionToken = ''
}: {
	files: Id<'files'>[];
	onFilesChange: (fileIds: Id<'files'>[]) => void;
	/** Reports fresh uploads, so the owner can delete them if never saved. */
	onUploaded?: (fileIds: Id<'files'>[]) => void;
	sessionToken?: string;
} = $props();

const ALLOWED_TYPES = ['image/', 'application/pdf'];
const MAX_BYTES = 10 * 1024 * 1024;

const client = useConvexClient();
let isUploading = $state(false);
let dragOver = $state(false);
let uploadError = $state<string | null>(null);
let copiedFileId = $state<Id<'files'> | null>(null);
let copyTimer: ReturnType<typeof setTimeout> | null = null;
let uploadedFiles = $state<FileDoc[]>([]);

// Mirror the `files` prop; the token drops a slower, superseded load.
let loadToken = 0;
$effect(() => {
	const ids = files;
	const token = ++loadToken;
	if (ids.length === 0) {
		uploadedFiles = [];
		return;
	}
	client
		.query(api.files.getFiles, { fileIds: ids })
		.then((results) => {
			if (token === loadToken) uploadedFiles = results;
		})
		.catch(() => {
			if (token === loadToken) uploadedFiles = [];
		});
});

async function uploadOne(file: File): Promise<Id<'files'>> {
	const { key, url } = await client.mutation(api.files.generateUploadUrl, { sessionToken });
	const put = await fetch(url, { method: 'PUT', body: file });
	if (!put.ok) throw new Error('Upload failed');
	return await client.mutation(api.files.updateFileMetadataByStorageId, {
		sessionToken,
		storageId: key,
		name: file.name,
		type: file.type,
		size: file.size
	});
}

async function handleFileUpload(fileList: FileList) {
	if (!fileList.length) return;
	if (!sessionToken) {
		uploadError = '로그인이 필요합니다.';
		return;
	}

	isUploading = true;
	uploadError = null;
	const rejected: string[] = [];

	// Each file stands alone, so one failure doesn't strand the ones that landed.
	const ids = await Promise.all(
		Array.from(fileList).map(async (file) => {
			if (!ALLOWED_TYPES.some((type) => file.type.startsWith(type))) {
				rejected.push(`${file.name} — 이미지 또는 PDF만 올릴 수 있습니다`);
				return null;
			}
			if (file.size > MAX_BYTES) {
				rejected.push(`${file.name} — 10MB를 넘습니다`);
				return null;
			}
			try {
				return await uploadOne(file);
			} catch {
				rejected.push(`${file.name} — 업로드하지 못했습니다`);
				return null;
			}
		})
	);

	const newIds = ids.filter((id): id is Id<'files'> => id !== null);
	if (newIds.length > 0) {
		onUploaded?.(newIds);
		onFilesChange([...files, ...newIds]);
	}
	if (rejected.length > 0) uploadError = rejected.join('\n');
	isUploading = false;
}

// Detach only; the editor deletes the file once the notice is saved without it.
function removeFile(fileId: Id<'files'>) {
	onFilesChange(files.filter((id) => id !== fileId));
}

async function copyMarkdown(file: FileDoc) {
	const markdown = file.type.startsWith('image/') ? `![${file.name}](${file.url})` : `[${file.name}](${file.url})`;
	try {
		if (!navigator.clipboard || !window.isSecureContext) throw new Error('no clipboard');
		await navigator.clipboard.writeText(markdown);
		copiedFileId = file._id;
		if (copyTimer) clearTimeout(copyTimer);
		copyTimer = setTimeout(() => (copiedFileId = null), 1000);
	} catch {
		uploadError = '복사하지 못했습니다.';
	}
}

$effect(() => () => {
	if (copyTimer) clearTimeout(copyTimer);
});

function handleDrop(e: DragEvent) {
	e.preventDefault();
	dragOver = false;
	if (e.dataTransfer?.files) handleFileUpload(e.dataTransfer.files);
}
</script>

<div class="space-y-3">
	{#if uploadError}
		<p
			class="whitespace-pre-line rounded-2xl border border-destructive/30 bg-destructive/10 px-3.5 py-2.5 text-sm font-semibold text-destructive"
			role="alert"
		>
			{uploadError}
		</p>
	{/if}

	<div
		role="group"
		aria-label="파일 업로드"
		class="border-2 border-dashed rounded-2xl p-5 text-center transition-colors duration-150 {dragOver
			? 'border-ring bg-muted'
			: 'border-border'}"
		ondragover={(e) => {
			e.preventDefault();
			dragOver = true;
		}}
		ondragleave={(e) => {
			// Moving onto a child fires dragleave too; only leaving the zone counts.
			if (!e.currentTarget.contains(e.relatedTarget as Node | null)) dragOver = false;
		}}
		ondrop={handleDrop}
	>
		<input
			type="file"
			multiple
			accept="image/*,application/pdf"
			onchange={async (e) => {
				const input = e.currentTarget;
				if (input.files) await handleFileUpload(input.files);
				input.value = '';
			}}
			class="hidden"
			id="file-upload"
			disabled={isUploading}
		/>

		{#if isUploading}
			<div class="flex items-center justify-center gap-2.5 text-sm text-muted-foreground" role="status" aria-live="polite">
				<Spinner size="md" />
				<span>파일 업로드 중…</span>
			</div>
		{:else}
			<p class="text-sm text-muted-foreground mb-3">이미지나 PDF 파일을 드래그하거나 클릭해서 업로드하세요</p>
			<PillButton text="파일 추가" variant="secondary" onclick={() => document.getElementById('file-upload')?.click()} />
		{/if}
	</div>

	{#if uploadedFiles.length > 0}
		<div class="space-y-2">
			<h4 class="text-sm font-semibold text-muted-foreground">첨부된 파일</h4>
			<ul class="space-y-1.5">
				{#each uploadedFiles as file (file._id)}
					<li class="flex items-center justify-between gap-2 p-2 rounded-2xl bg-muted/50 border border-border">
						<div class="flex items-center gap-2 flex-1 min-w-0">
							<FileIcon
								mime={file.type}
								class="w-4 h-4 shrink-0 {file.type.startsWith('image/') ? 'text-muted-foreground' : 'text-red-500'}"
							/>
							<div class="flex-1 min-w-0">
								<p class="text-sm text-foreground truncate">{file.name}</p>
								<p class="text-xs text-muted-foreground tabular-nums">{formatFileSize(file.size)}</p>
							</div>
						</div>
						<div class="flex items-center gap-1.5 shrink-0">
							<button
								type="button"
								onclick={() => copyMarkdown(file)}
								class="pressable rounded-lg px-2.5 py-1.5 text-sm font-semibold border border-border text-foreground transition-colors duration-150 pointer:hover:bg-muted"
								title="마크다운 복사"
							>
								<span class="relative inline-flex h-4 min-w-[2.5rem] items-center justify-center">
									{#key copiedFileId === file._id}
										<span class="absolute inset-0 flex items-center justify-center" in:fly={flyHelper} out:fly={flyHelperOut}>
											{copiedFileId === file._id ? '복사됨' : '복사'}
										</span>
									{/key}
								</span>
							</button>
							<button
								type="button"
								onclick={() => removeFile(file._id)}
								class="pressable rounded-lg px-2.5 py-1.5 text-sm font-semibold border border-border text-destructive transition-colors duration-150 pointer:hover:bg-destructive/10"
							>
								삭제
							</button>
						</div>
					</li>
				{/each}
			</ul>
		</div>
	{/if}
</div>
