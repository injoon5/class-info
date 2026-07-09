<script lang="ts">
let { error }: { error: any } = $props();
</script>

<div class="flex flex-col items-center justify-center py-20 text-center px-4">
	<div class="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mb-3">
		<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="w-6 h-6 text-red-500 dark:text-red-400" aria-hidden="true">
			<path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"/>
		</svg>
	</div>
	<p class="text-[15px] font-medium text-neutral-800 dark:text-neutral-200">데이터를 불러오지 못했습니다</p>
	<p class="text-sm text-neutral-500 dark:text-neutral-400 mt-1 max-w-sm break-words">{error?.toString()}</p>
	<button
		onclick={() => window.location.reload()}
		class="pressable mt-5 px-5 py-2.5 rounded-full bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 text-sm font-semibold hover:opacity-90 transition-opacity"
	>다시 시도</button>
</div>
