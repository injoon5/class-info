<script lang="ts">
let { message = '등록된 알림이 없습니다' }: { message?: string } = $props();
</script>

<div class="flex flex-col items-center justify-center py-20 text-center">
	<div class="w-12 h-12 rounded-full bg-neutral-950/[0.05] dark:bg-white/[0.07] flex items-center justify-center mb-3">
		<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="w-6 h-6 text-neutral-400 dark:text-neutral-500" aria-hidden="true">
			<path stroke-linecap="round" stroke-linejoin="round" d="M2.25 13.5h3.86a2.25 2.25 0 012.012 1.244l.256.512a2.25 2.25 0 002.013 1.244h3.218a2.25 2.25 0 002.013-1.244l.256-.512a2.25 2.25 0 012.013-1.244h3.859m-19.5.338V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18v-4.162c0-.224-.034-.447-.1-.661L19.24 5.338a2.25 2.25 0 00-2.15-1.588H6.911a2.25 2.25 0 00-2.15 1.588L2.35 13.177a2.25 2.25 0 00-.1.661z"/>
		</svg>
	</div>
	<p class="text-[15px] font-medium text-neutral-500 dark:text-neutral-400">{message}</p>
</div>
