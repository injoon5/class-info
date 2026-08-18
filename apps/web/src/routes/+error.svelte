<script lang="ts">
    import { page } from '$app/state';
</script>

<svelte:head>
	<title>{page.status === 404 ? '페이지를 찾을 수 없습니다' : '문제가 발생했습니다'}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="min-h-[60vh]">
	<div class="max-w-4xl mx-auto p-4">
		<div class="flex flex-col items-center text-center gap-3 py-20">
			<p class="text-6xl font-bold tracking-tight tabular-nums text-foreground" aria-hidden="true">{page.status}</p>
			<h1 class="text-2xl font-semibold tracking-tight text-foreground">
				{page.status === 404 ? '페이지를 찾을 수 없습니다' : '문제가 발생했습니다'}
			</h1>
			{#if page.error?.message}
				<p class="text-muted-foreground">{page.error.message}</p>
			{/if}
			<a href="/" class="pressable mt-3 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-opacity pointer:hover:opacity-90">
				홈으로 돌아가기
			</a>
		</div>
	</div>
</div>


