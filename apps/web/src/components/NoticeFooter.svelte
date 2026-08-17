<script lang="ts">
import { generateCopyText } from '../lib/utils.js';

let { notices }: { notices: any[] } = $props(); // groups array from server

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
<div class="flex items-center justify-center gap-3 py-4 mt-6 sm:mt-8 border-t border-border text-xs text-muted-foreground">
	<button
		onclick={copyToClipboard}
		class="pressable rounded-full border border-border px-3 py-1.5 font-medium text-muted-foreground transition-colors pointer:hover:text-foreground pointer:hover:bg-muted"
	>
		알림 복사
	</button>
	<a
		href="/admin"
		class="pressable rounded-full px-3 py-1.5 font-medium text-muted-foreground transition-colors pointer:hover:text-foreground pointer:hover:bg-muted"
	>
		관리자
	</a>
</div>