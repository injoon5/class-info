<script lang="ts">
let { error }: { error: any } = $props();
</script>

<div class="flex flex-col items-center text-center py-16 px-4">
	<div class="flex items-center justify-center w-12 h-12 rounded-full bg-destructive/10 mb-3">
		<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="w-6 h-6 text-destructive">
			<path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
		</svg>
	</div>
	<p class="text-sm font-medium text-foreground">데이터를 불러오는 중 오류가 발생했습니다.</p>
	{#if error}
		<p class="text-xs text-muted-foreground mt-1 max-w-xs break-words">{error?.toString?.() ?? ''}</p>
	{/if}
	<button
		onclick={() => window.location.reload()}
		class="pressable mt-4 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity pointer:hover:opacity-90"
	>
		다시 시도
	</button>
</div>
