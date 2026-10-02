<script lang="ts">
import { fly } from 'svelte/transition';
import { beforeNavigate } from '$app/navigation';
import { updated } from '$app/state';
import { toastIn, toastOut } from '#lib/transitions.js';
import PillButton from '#lib/components/ui/PillButton.svelte';

// SvelteKit polls for a new deployment (and checks on focus and on every
// server round trip). Old chunks can 404 after a deploy, so offer a reload.
let dismissed = $state(false);
let reloading = $state(false);

const visible = $derived(updated.current && !dismissed);

function reload() {
	reloading = true;
	location.reload();
}

// Navigating is a free moment to pick up the new version: do it as a full
// page load instead of a client-side one against the stale build.
beforeNavigate(({ willUnload, to }) => {
	if (updated.current && !willUnload && to?.url) {
		location.href = to.url.href;
	}
});
</script>

<div
	role="status"
	class="fixed inset-x-0 z-40 flex justify-center px-4 pointer-events-none bottom-[calc(var(--sab)+1rem)] print:hidden"
>
	{#if visible}
		<div
			in:fly={toastIn}
			out:fly={toastOut}
			class="pointer-events-auto flex items-center gap-1 rounded-full border border-border bg-elevated py-1.5 pl-4 pr-1.5 shadow-lg shadow-black/10 dark:shadow-black/40"
		>
			<p class="text-sm font-medium text-foreground mr-2">새 버전이 있어요</p>
			<PillButton size="sm" text="새로고침" pending={reloading} onclick={reload} />
			<button
				type="button"
				onclick={() => (dismissed = true)}
				class="pressable-icon touch-target flex items-center justify-center w-7 h-7 rounded-full text-muted-foreground pointer:hover:text-foreground pointer:hover:bg-muted transition-colors duration-150"
				aria-label="닫기"
			>
				<svg viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4" aria-hidden="true">
					<path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
				</svg>
			</button>
		</div>
	{/if}
</div>
