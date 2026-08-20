<script lang="ts">
import { generateCopyText, type DayGroup } from '$lib/notices';
import MorphLabel from '$lib/components/ui/MorphLabel.svelte';

const { notices }: { notices: DayGroup[] } = $props();

let copied = $state(false);
let lastCopied = 0;

const clipboardAvailable = $derived(
	typeof navigator !== 'undefined' && !!navigator.clipboard && window.isSecureContext
);

const hasCopyableText = $derived(!!generateCopyText(notices || []));
const canCopy = $derived(clipboardAvailable && hasCopyableText);

function announce(message: string) {
	const region = document.getElementById('aria-live-region');
	if (region) region.textContent = message;
}

async function copyToClipboard() {
	const text = generateCopyText(notices || []);
	if (!text) return;

	try {
		await navigator.clipboard.writeText(text);
		const stamp = Date.now();
		lastCopied = stamp;
		copied = true;
		announce('클립보드에 복사했어요');
		setTimeout(() => {
			if (lastCopied === stamp) copied = false;
		}, 1600);
	} catch {
		announce('복사하지 못했어요');
	}
}
</script>

<footer class="mt-16 mb-6 flex items-baseline justify-between gap-8 text-xs text-muted-foreground">
	<button
		type="button"
		onclick={copyToClipboard}
		disabled={!canCopy}
		class="touch-target py-1 transition-colors duration-150 pointer:hover:text-foreground disabled:opacity-30 disabled:pointer-events-none"
	>
		<MorphLabel text={copied ? '복사됨' : '복사'} />
	</button>
	<a
		href="/admin"
		class="touch-target py-1 transition-colors duration-150 pointer:hover:text-foreground"
	>
		관리
	</a>
</footer>
