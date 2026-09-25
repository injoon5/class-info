<script lang="ts">
const { title, href }: { title: string; href: string } = $props();
</script>

<div class="flex items-baseline justify-between mb-2.5">
	<h2 class="font-semibold text-muted-foreground">{title}</h2>
	<a
		{href}
		aria-label="{title} 모두 보기"
		class="text-sm font-semibold text-muted-foreground transition-colors duration-150 pointer:hover:text-foreground"
		>모두 보기 <span aria-hidden="true">→</span></a
	>
</div>
