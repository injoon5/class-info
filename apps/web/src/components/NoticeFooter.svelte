<script lang="ts">
import { generateCopyText } from '../lib/utils.js';

let { notices }: { notices: any[] } = $props(); // groups array from server

const flat = $derived((notices || []).flatMap((g: any) => Array.isArray(g?.notices) ? g.notices : [g]));
const latestTs = $derived(flat.length > 0 ? Math.max(...flat.map((n: any) => n?.updatedAt || n?.createdAt).filter(Boolean)) : null);
const latestText = $derived(latestTs ? new Date(latestTs).toLocaleString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : null);


async function copyToClipboard() {
	const text = generateCopyText(notices || []);
	if (!text) {
		alert('복사할 알림이 없습니다.');
		return;
	}
	
	try {
		await navigator.clipboard.writeText(text);
		alert('클립보드에 복사되었습니다!');
	} catch (err) {
		alert('복사에 실패했습니다.');
	}
}
</script>

<!-- Footer -->
<div class="text-center py-3 sm:py-4 text-xs text-neutral-500 dark:text-neutral-400 border-t border-neutral-200 dark:border-neutral-700 mt-6 sm:mt-8">
    {#if latestText}
        마지막 업데이트: {latestText}
    {:else}
        마지막 업데이트: 데이터 없음
    {/if}
</div>

<!-- Buttons -->
<div class="text-center py-3 sm:py-4 text-xs text-neutral-500 dark:text-neutral-400 space-y-1.5 sm:space-y-2">
	<div>
		<button 
			onclick={copyToClipboard}
			class="text-xs text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 underline"
		>
			알림 복사
		</button>
	</div>
	<div>
		<a href="/admin" class="text-xs text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 underline">
			관리자
		</a>
	</div>
</div>