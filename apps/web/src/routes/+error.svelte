<script lang="ts">
	import { page } from '$app/state';
</script>

<svelte:head>
	<title>{page.status === 404 ? '페이지를 찾을 수 없습니다' : '문제가 발생했습니다'}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="min-h-[60vh] flex items-center justify-center">
	<div class="max-w-4xl mx-auto p-4">
		<div class="flex flex-col items-center text-center py-16">
			<h2 class="text-[4rem] leading-none font-bold tracking-[-0.03em] tabular-nums text-neutral-200 dark:text-neutral-700 select-none">{page.status}</h2>
			<h2 class="mt-4 text-xl sm:text-2xl font-semibold tracking-[-0.01em] text-neutral-900 dark:text-neutral-100">
				{page.status === 404 ? '페이지를 찾을 수 없습니다' : '문제가 발생했습니다'}
			</h2>
			{#if page.error?.message && page.status !== 404}
				<p class="mt-2 text-sm text-neutral-500 dark:text-neutral-400">{page.error.message}</p>
			{/if}
			<a
				href="/"
				class="pressable mt-7 px-5 py-2.5 rounded-full bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 text-sm font-semibold hover:opacity-90 transition-opacity"
			>홈으로 돌아가기</a>
		</div>
	</div>
</div>
