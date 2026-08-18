<script lang="ts">
import { generateCopyText } from '../lib/utils.js';

let { notices }: { notices: any[] } = $props(); // groups array from server

let copied = $state(false);
let resetTimer: ReturnType<typeof setTimeout> | undefined;

// The layout ships a polite live region; this is what it is for. A modal
// alert() for a confirmation the button itself can carry is a heavier control
// than the action deserves.
function announce(message: string) {
	const region = document.getElementById('aria-live-region');
	if (region) region.textContent = message;
}

async function copyToClipboard() {
	const text = generateCopyText(notices || []);
	if (!text) {
		announce('복사할 공지가 없습니다');
		return;
	}

	try {
		await navigator.clipboard.writeText(text);
		copied = true;
		announce('클립보드에 복사되었습니다');
		clearTimeout(resetTimer);
		resetTimer = setTimeout(() => { copied = false; }, 2000);
	} catch {
		announce('복사에 실패했습니다');
	}
}
</script>

<!-- Buttons -->
<div class="flex items-center justify-center gap-3 py-4 mt-6 sm:mt-8 border-t border-border text-xs text-muted-foreground">
	<button
		onclick={copyToClipboard}
		class="pressable rounded-full border border-border px-3 py-1.5 font-medium text-muted-foreground transition-colors pointer:hover:text-foreground pointer:hover:bg-muted"
	>
		{copied ? '복사됨' : '공지 복사'}
	</button>
	<a
		href="/admin"
		class="pressable rounded-full px-3 py-1.5 font-medium text-muted-foreground transition-colors pointer:hover:text-foreground pointer:hover:bg-muted"
	>
		관리자
	</a>
</div>
