<script lang="ts">
    import { page } from '$app/state';

    let { status, error } = $props();
    console.log(status, error);
</script>

<svelte:head>
	<title>{status === 404 ? '페이지를 찾을 수 없습니다' : '문제가 발생했습니다'}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="min-h-[60vh]">
	<div class="max-w-4xl mx-auto p-4">
		<div class="flex flex-col items-center text-center gap-4 py-16">
            <h2 class="text-[3rem] font-semibold text-neutral-800 dark:text-neutral-200">{page.status === 404 ? '404' : page.status}</h2>
			<h2 class="text-2xl font-semibold text-neutral-800 dark:text-neutral-200">
                {page.status === 404 ? '페이지를 찾을 수 없습니다' : '문제가 발생했습니다'}
			</h2>
            {#if page.error?.message}
                <p class="text-neutral-600 dark:text-neutral-400">{page.error.message}</p>
			{/if}


		</div>
	</div>
</div>


