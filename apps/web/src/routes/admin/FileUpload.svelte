<script lang="ts">
import { useConvexClient } from 'convex-svelte';
import { api } from "@class-info/backend/convex/_generated/api";
import type { Id } from "@class-info/backend/convex/_generated/dataModel";
import { fly } from 'svelte/transition';
import { flyHelper } from '$lib/transitions';
import PillButton from '$lib/components/ui/PillButton.svelte';
import Spinner from '$lib/components/ui/Spinner.svelte';
import { formatFileSize } from '$lib/format';

const {
  files = [],
  onFilesChange,
  sessionToken = ''
}: { files: Id<'files'>[]; onFilesChange: (fileIds: Id<'files'>[]) => void; sessionToken?: string } = $props();

const client = useConvexClient();
let isUploading = $state(false);
let dragOver = $state(false);
// Upload problems belong on the drop zone, not in a browser modal.
let uploadError = $state<string | null>(null);
let copiedFileId = $state<Id<'files'> | null>(null);
let lastCopied = 0;

interface UploadedFile {
  _id: Id<'files'>;
  name: string;
  type: string;
  size: number;
  url: string;
}

let uploadedFiles = $state<UploadedFile[]>([]);

// Keep the displayed list in sync with the `files` prop. Reload when it has
// entries; clear when it empties (e.g. after cancelling/resetting the form) so
// a previous notice's attachments don't linger. A load token guards against
// overlapping async loads clobbering each other.
let loadToken = 0;
$effect(() => {
  const ids = files;
  if (ids.length === 0) {
    uploadedFiles = [];
    return;
  }
  loadFiles(ids);
});

async function loadFiles(ids: Id<'files'>[]) {
  const token = ++loadToken;
  try {
    const results = await client.query(api.files.getFiles, {
      fileIds: ids,
    });
    if (token !== loadToken) return; // a newer load superseded this one
    uploadedFiles = results;
  } catch {
    if (token === loadToken) uploadedFiles = [];
  }
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

  try {
    const uploadPromises = Array.from(fileList).map(async (file) => {
      // Validate file type
      const allowedTypes = ['image/', 'application/pdf'];
      if (!allowedTypes.some(type => file.type.startsWith(type))) {
        rejected.push(`${file.name} — 이미지 또는 PDF만 올릴 수 있습니다`);
        return null;
      }
      
      // Validate file size (10MB max)
      if (file.size > 10 * 1024 * 1024) {
        rejected.push(`${file.name} — 10MB를 넘습니다`);
        return null;
      }
      
      const { key, url } = await client.mutation(api.files.generateUploadUrl, { sessionToken });
      const put = await fetch(url, { method: 'PUT', body: file });
      if (!put.ok) throw new Error('Upload failed');

      const fileId = await client.mutation(api.files.updateFileMetadataByStorageId, {
        sessionToken,
        storageId: key,
        name: file.name,
        type: file.type,
        size: file.size,
      });
      
      return fileId;
    });
    
    const newFileIds = (await Promise.all(uploadPromises)).filter((id): id is Id<'files'> => id !== null);
    const updatedFiles = [...files, ...newFileIds];
    onFilesChange(updatedFiles);
    if (rejected.length > 0) uploadError = rejected.join('\n');
  } catch {
    uploadError = '업로드하지 못했습니다. 잠시 후 다시 시도해 주세요.';
  } finally {
    isUploading = false;
  }
}

async function removeFile(fileId: Id<'files'>) {
  try {
    await client.mutation(api.files.deleteFile, { sessionToken, fileId });
    const updatedFiles = files.filter(id => id !== fileId);
    onFilesChange(updatedFiles);
    // Also update the local uploadedFiles array immediately
    uploadedFiles = uploadedFiles.filter(file => file._id !== fileId);
  } catch {
    uploadError = '파일을 삭제하지 못했습니다. 잠시 후 다시 시도해 주세요.';
  }
}

function copyMarkdownToClipboard(file: UploadedFile) {
  const markdown = file.type.startsWith('image/') 
    ? `![${file.name}](${file.url})`
    : `[${file.name}](${file.url})`;
  
  navigator.clipboard.writeText(markdown).then(() => {
    const stamp = Date.now();
    lastCopied = stamp;
    copiedFileId = file._id;
    setTimeout(() => {
      if (lastCopied === stamp) copiedFileId = null;
    }, 1000);
  }).catch(() => {
    uploadError = '복사하지 못했습니다.';
  });
}

function handleDragOver(e: DragEvent) {
  e.preventDefault();
  dragOver = true;
}

function handleDragLeave(e: DragEvent) {
  e.preventDefault();
  dragOver = false;
}

function handleDrop(e: DragEvent) {
  e.preventDefault();
  dragOver = false;
  if (e.dataTransfer?.files) {
    handleFileUpload(e.dataTransfer.files);
  }
}
</script>

<div class="space-y-3">
  {#if uploadError}
    <p class="whitespace-pre-line rounded-2xl border border-destructive/30 bg-destructive/10 px-3.5 py-2.5 text-sm font-semibold text-destructive" role="alert">
      {uploadError}
    </p>
  {/if}

  <div
    role="group"
    aria-label="파일 업로드"
    class="border-2 border-dashed rounded-2xl {dragOver ? 'border-ring bg-muted' : 'border-border'} p-5 text-center transition-colors duration-150"
    ondragover={handleDragOver}
    ondragleave={handleDragLeave}
    ondrop={handleDrop}
  >
    <input
      type="file"
      multiple
      accept="image/*,application/pdf"
      onchange={(e) => { const t = e.currentTarget as HTMLInputElement; if (t.files) handleFileUpload(t.files); }}
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
      <label for="file-upload" class="cursor-pointer">
        <p class="text-sm text-muted-foreground mb-3">
          이미지나 PDF 파일을 드래그하거나 클릭해서 업로드하세요
        </p>
        <PillButton
          text="파일 추가"
          variant="secondary"
          onclick={() => document.getElementById('file-upload')?.click()}
        />
      </label>
    {/if}
  </div>

  <!-- File List -->
  {#if uploadedFiles.length > 0}
    <div class="space-y-2">
      <h4 class="text-sm font-semibold text-muted-foreground">첨부된 파일</h4>
      <div class="space-y-1.5">
        {#each uploadedFiles as file (file._id)}
          <div
            class="flex items-center justify-between gap-2 p-2 rounded-2xl bg-muted/50 border border-border group"
            title="클릭하면 마크다운 코드를 복사할 수 있습니다"
          >
            <div class="flex items-center gap-2 flex-1 min-w-0">
              <div class="flex-shrink-0">
                {#if file.type.startsWith('image/')}
                  <svg class="w-4 h-4 text-muted-foreground" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clip-rule="evenodd"/>
                  </svg>
                {:else}
                  <svg class="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clip-rule="evenodd"/>
                  </svg>
                {/if}
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm text-foreground truncate">{file.name}</p>
                <p class="text-xs text-muted-foreground tabular-nums">{formatFileSize(file.size)}</p>
              </div>
            </div>
            <div class="flex items-center gap-1.5 flex-shrink-0">
              <button
                type="button"
                onclick={() => copyMarkdownToClipboard(file)}
                class="pressable rounded-lg px-2.5 py-1.5 text-sm font-semibold border border-border text-foreground transition-colors duration-150 pointer:hover:bg-muted"
                title="마크다운 복사"
              >
                <span class="relative inline-flex h-4 min-w-[2.5rem] items-center justify-center">
                  {#key copiedFileId === file._id}
                    <span class="absolute inset-0 flex items-center justify-center" in:fly={flyHelper}>
                      {copiedFileId === file._id ? '복사됨' : '복사'}
                    </span>
                  {/key}
                </span>
              </button>
              <button
                type="button"
                onclick={() => removeFile(file._id)}
                class="pressable rounded-lg px-2.5 py-1.5 text-sm font-semibold border border-border text-destructive transition-colors pointer:hover:bg-destructive/10"
                title="파일 삭제"
              >
                삭제
              </button>
            </div>
          </div>
        {/each}
      </div>
      <p class="text-xs text-muted-foreground hidden sm:block">
        파일에 마우스를 올리면 마크다운 복사 버튼이 나타납니다.
      </p>
    </div>
  {/if}
</div>