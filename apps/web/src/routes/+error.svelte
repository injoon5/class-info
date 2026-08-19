<script lang="ts">
    import { page } from '$app/state';
    import PillButton from '$lib/components/ui/PillButton.svelte';
</script>

<svelte:head>
	<title>{page.status === 404 ? '페이지를 찾을 수 없어요' : '문제가 생겼어요'}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="min-h-[60vh]">
	<div class="max-w-4xl mx-auto p-4">
		<div class="flex flex-col items-center text-center gap-3 py-20">
			<p class="text-6xl font-bold tracking-tight tabular-nums text-foreground" aria-hidden="true">{page.status}</p>
			<h1 class="text-2xl font-semibold tracking-tight text-foreground">
				{page.status === 404 ? '페이지를 찾을 수 없어요' : '문제가 생겼어요'}
			</h1>
			{#if page.error?.message}
				<p class="text-muted-foreground">{page.error.message}</p>
			{/if}
			<PillButton href="/" text="홈으로 돌아가기" class="mt-3" />
		</div>
	</div>
</div>


