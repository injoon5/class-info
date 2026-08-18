<script lang="ts">
import { fly } from 'svelte/transition';
import { generateCopyText } from '../lib/utils.js';

const { notices }: { notices: any[] } = $props(); // groups array from server

let copied = $state(false);
let lastCopied = 0;

// Clipboard needs a secure context; without one the API is present but throws.
const canCopy = $derived(
	typeof navigator !== 'undefined' && !!navigator.clipboard && window.isSecureContext
);

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
		announce('복사할 공지가 없어요');
		return;
	}

	try {
		await navigator.clipboard.writeText(text);
		// Stamp the copy so a later one's timer can't clear this one's label.
		const stamp = Date.now();
		lastCopied = stamp;
		copied = true;
		announce('클립보드에 복사했어요');
		setTimeout(() => {
			if (lastCopied === stamp) copied = false;
		}, 1000);
	} catch {
		announce('복사하지 못했어요');
	}
}
</script>

<!-- Buttons -->
<div class="flex items-center justify-center gap-3 py-4 mt-6 sm:mt-8 border-t border-border text-xs text-muted-foreground">
	<button
		onclick={copyToClipboard}
		disabled={!canCopy}
		class="pressable rounded-full border border-border px-3 py-1.5 font-medium text-muted-foreground transition-colors duration-150 enabled:pointer:hover:text-foreground enabled:pointer:hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
	>
		<!-- Fixed width so confirming the copy doesn't resize the pill. -->
		<span class="relative inline-flex h-4 min-w-[4.5rem] items-center justify-center">
			{#if !canCopy}
				복사 지원 안 됨
			{:else}
				{#key copied}
					<span class="absolute inset-0 flex items-center justify-center" in:fly={{ y: 3, duration: 150 }}>
						{copied ? '복사됨' : '공지 복사'}
					</span>
				{/key}
			{/if}
		</span>
	</button>
	<a
		href="/admin"
		class="pressable rounded-full px-3 py-1.5 font-medium text-muted-foreground transition-colors duration-150 pointer:hover:text-foreground pointer:hover:bg-muted"
	>
		관리자
	</a>
</div>
