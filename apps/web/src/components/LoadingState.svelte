<script lang="ts">
const { compact = false }: { compact?: boolean } = $props();
</script>

<div
	class="flex items-center gap-2.5 text-sm text-muted-foreground {compact
		? 'justify-center py-6'
		: 'justify-center py-16'}"
	role="status"
	aria-live="polite"
>
	<span
		class="w-4 h-4 rounded-full border-2 border-border border-t-foreground animate-spin"
		aria-hidden="true"
	></span>
	<span>불러오는 중…</span>
</div>
