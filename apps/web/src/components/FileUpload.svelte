<script lang="ts">
import { useConvexClient } from 'convex-svelte';
import { useUploadFile } from "@convex-dev/r2/svelte";
import { api } from "@class-info/backend/convex/_generated/api";

export let files: any[] = []; // Array of file IDs
export let onFilesChange: (fileIds: any[]) => void;

const client = useConvexClient();
const uploadFile = useUploadFile(api.files);
let isUploading = false;
let dragOver = false;

interface UploadedFile {
  _id: string;
  name: string;
  type: string;
  size: number;
  url: string;
}

let uploadedFiles: UploadedFile[] = [];

// Load existing files when component mounts
$: if (files.length > 0) {
  loadFiles();
}

async function loadFiles() {
  try {
    const filePromises = files.map(fileId => 
      client.query(api.files.getFile, { fileId })
    );
    const results = await Promise.all(filePromises);
    uploadedFiles = results.filter((file): file is UploadedFile => file !== null);
  } catch (error) {
    console.error('Error loading files:', error);
    uploadedFiles = [];
  }
}

async function handleFileUpload(fileList: FileList) {
  if (!fileList.length) return;
  
  isUploading = true;
  
  try {
    const uploadPromises = Array.from(fileList).map(async (file) => {
      // Validate file type
      const allowedTypes = ['image/', 'application/pdf'];
      if (!allowedTypes.some(type => file.type.startsWith(type))) {
        alert(`지원하지 않는 파일 형식입니다: ${file.name}`);
        return null;
      }
      
      // Validate file size (10MB max)
      if (file.size > 10 * 1024 * 1024) {
        alert(`파일 크기가 너무 큽니다: ${file.name} (최대 10MB)`);
        return null;
      }
      
      // Upload file using the useUploadFile hook
      const storageId = await uploadFile(file);
      console.log('Upload result (storageId):', storageId);
      
      // Update file metadata using storage ID and get the file ID back
      const fileId = await client.mutation(api.files.updateFileMetadataByStorageId, {
        storageId,
        name: file.name,
        type: file.type,
        size: file.size,
      });
      
      return fileId;
    });
    
    const newFileIds = (await Promise.all(uploadPromises)).filter(Boolean);
    const updatedFiles = [...files, ...newFileIds];
    onFilesChange(updatedFiles);
  } catch (error) {
    console.error('Upload error:', error);
    alert('파일 업로드 중 오류가 발생했습니다.');
  } finally {
    isUploading = false;
  }
}

async function removeFile(fileId: string) {
  try {
    await client.mutation(api.files.deleteFile, { fileId });
    const updatedFiles = files.filter(id => id !== fileId);
    onFilesChange(updatedFiles);
  } catch (error) {
    console.error('Error removing file:', error);
    alert('파일 삭제 중 오류가 발생했습니다.');
  }
}

function copyMarkdownToClipboard(file: UploadedFile) {
  const markdown = file.type.startsWith('image/') 
    ? `![${file.name}](${file.url})`
    : `[${file.name}](${file.url})`;
  
  navigator.clipboard.writeText(markdown).then(() => {
    alert('마크다운 코드가 클립보드에 복사되었습니다!');
  }).catch(() => {
    alert('복사에 실패했습니다.');
  });
}

function formatFileSize(bytes: number) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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
  <!-- File Upload Area -->
  <div 
    class="border-2 border-dashed {dragOver ? 'border-neutral-500 bg-neutral-50 dark:bg-neutral-700' : 'border-neutral-300 dark:border-neutral-600'} p-4 text-center transition-colors"
    ondragover={handleDragOver}
    ondragleave={handleDragLeave}
    ondrop={handleDrop}
  >
    <input 
      type="file" 
      multiple 
      accept="image/*,application/pdf"
      onchange={(e) => e.target?.files && handleFileUpload(e.target.files)}
      class="hidden"
      id="file-upload"
      disabled={isUploading}
    />
    
    {#if isUploading}
      <p class="text-neutral-500 dark:text-neutral-400">파일 업로드 중...</p>
    {:else}
      <label for="file-upload" class="cursor-pointer">
        <p class="text-neutral-600 dark:text-neutral-300 mb-2">
          이미지나 PDF 파일을 드래그하거나 클릭해서 업로드하세요
        </p>
        <button 
          type="button"
          class="px-4 py-2 border border-neutral-400 dark:border-neutral-500 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-600 text-neutral-800 dark:text-neutral-200"
          onclick={() => document.getElementById('file-upload')?.click()}
        >
          파일 추가
        </button>
      </label>
    {/if}
  </div>

  <!-- File List -->
  {#if uploadedFiles.length > 0}
    <div class="space-y-2">
      <h4 class="text-sm font-medium text-neutral-600 dark:text-neutral-300">첨부된 파일</h4>
      <div class="space-y-1">
        {#each uploadedFiles as file}
          <div 
            class="flex items-center justify-between p-2 bg-neutral-50 dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-600 transition-colors group"
            title="클릭하면 마크다운 코드를 복사할 수 있습니다"
          >
            <div class="flex items-center gap-2 flex-1 min-w-0">
              <div class="flex-shrink-0">
                {#if file.type.startsWith('image/')}
                  <svg class="w-4 h-4 text-neutral-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clip-rule="evenodd"/>
                  </svg>
                {:else}
                  <svg class="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clip-rule="evenodd"/>
                  </svg>
                {/if}
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm text-neutral-800 dark:text-neutral-200 truncate">{file.name}</p>
                <p class="text-xs text-neutral-500 dark:text-neutral-400">{formatFileSize(file.size)}</p>
              </div>
            </div>
            <div class="flex items-center gap-1 flex-shrink-0">
              <button
                type="button"
                onclick={() => copyMarkdownToClipboard(file)}
                class="px-2 py-1 text-xs border border-neutral-300 dark:border-neutral-600 hover:bg-neutral-200 dark:hover:bg-neutral-500 text-neutral-600 dark:text-neutral-300 opacity-0 group-hover:opacity-100 transition-opacity"
                title="마크다운 복사"
              >
                복사
              </button>
              <button
                type="button"
                onclick={() => removeFile(file._id)}
                class="px-2 py-1 text-xs bg-red-600 dark:bg-red-500 text-white hover:bg-red-700 dark:hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                title="파일 삭제"
              >
                삭제
              </button>
            </div>
          </div>
        {/each}
      </div>
      <p class="text-xs text-neutral-500 dark:text-neutral-400">
        파일에 마우스를 올리면 마크다운 복사 버튼이 나타납니다.
      </p>
    </div>
  {/if}
</div>