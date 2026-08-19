<script lang="ts">
import { fly } from 'svelte/transition';
import { flyHelper } from '$lib/transitions';
import { generateCopyText } from '../lib/utils.js';
import PillButton from './PillButton.svelte';

const { notices }: { notices: any[] } = $props(); // groups array from server

let copied = $state(false);
let lastCopied = 0;

// Clipboard needs a secure context; without one the API is present but throws.
const clipboardAvailable = $derived(
	typeof navigator !== 'undefined' && !!navigator.clipboard && window.isSecureContext
);

// generateCopyText only emits 수행평가 rows, so "there are notices" is not the
// same question as "there is something to copy".
const hasCopyableText = $derived(!!generateCopyText(notices || []));
const canCopy = $derived(clipboardAvailable && hasCopyableText);

const label = $derived(
	!clipboardAvailable ? '복사 지원 안 됨' : !hasCopyableText ? '복사할 공지 없음' : copied ? '복사됨' : '공지 복사'
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
	if (!text) return;

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
	<PillButton onclick={copyToClipboard} disabled={!canCopy} variant="secondary" size="sm">
		<!-- Fixed width so confirming the copy doesn't resize the pill. -->
		<span class="relative inline-flex h-4 min-w-[6.5rem] items-center justify-center">
			{#key label}
				<span class="absolute inset-0 flex items-center justify-center whitespace-nowrap" in:fly={flyHelper}>
					{label}
				</span>
			{/key}
		</span>
	</PillButton>
	<PillButton href="/admin" text="관리자" variant="ghost" size="sm" />
</div>
