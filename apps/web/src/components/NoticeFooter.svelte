<script lang="ts">
import { generateCopyText } from '../lib/utils.js';

let { notices }: { notices: any[] } = $props(); // groups array from server

const flat = $derived((notices || []).flatMap((g: any) => Array.isArray(g?.notices) ? g.notices : [g]));
const latestTs = $derived(flat.length > 0 ? Math.max(...flat.map((n: any) => n?.updatedAt || n?.createdAt).filter(Boolean)) : null);


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

<!-- Buttons -->
<div class="flex items-center justify-center gap-1 py-4 sm:py-5 border-t border-[var(--separator)] mt-8 sm:mt-10">
	<button
		onclick={copyToClipboard}
		class="pressable px-3 py-1.5 rounded-full text-xs font-medium text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200 hover:bg-neutral-950/[0.04] dark:hover:bg-white/[0.06] transition-colors duration-150"
	>
		알림 복사
	</button>
	<span class="text-neutral-300 dark:text-neutral-600 text-xs" aria-hidden="true">·</span>
	<a
		href="/admin"
		class="pressable px-3 py-1.5 rounded-full text-xs font-medium text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200 hover:bg-neutral-950/[0.04] dark:hover:bg-white/[0.06] transition-colors duration-150"
	>
		관리자
	</a>
</div>