<script lang="ts">
import { generateCopyText } from '../lib/utils.js';

export let notices: any[];

function updateStatus(message: string) {

  const statusEl = document.getElementById('footer-status');
  if (statusEl) {
    statusEl.textContent = message;
  }
  alert(message); // Fallback alert for visibility
}

async function copyToClipboard() {
	const text = generateCopyText(notices || []);
	if (!text) {
		updateStatus('복사할 알림이 없습니다.');
		return;
	}

	try {
		await navigator.clipboard.writeText(text);
		updateStatus('클립보드에 복사되었습니다!');
	} catch (err) {
		updateStatus('복사에 실패했습니다.');
	}
}
</script>

<!-- ARIA live region for feedback -->
<div aria-live="polite" aria-atomic="true" class="sr-only" id="footer-status"></div>

<!-- Footer -->
<div class="text-center py-3 sm:py-4 text-xs text-neutral-500 dark:text-neutral-400 border-t border-neutral-200 dark:border-neutral-700 mt-6 sm:mt-8">
	{#if notices && notices.length > 0}
		마지막 업데이트: {new Date(Math.max(...notices.map(n => n.updatedAt || n.createdAt).filter(Boolean))).toLocaleString('ko-KR', { 
			year: 'numeric', 
			month: 'long', 
			day: 'numeric', 
			hour: '2-digit', 
			minute: '2-digit' 
		})}
	{:else}
		마지막 업데이트: 데이터 없음
	{/if}
</div>

<!-- Buttons -->
<div class="text-center py-3 sm:py-4 text-xs text-neutral-500 dark:text-neutral-400 space-y-1.5 sm:space-y-2">
	<div>
		<button 
			on:click={copyToClipboard}
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