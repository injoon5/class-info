<script lang="ts">
export let error: any;
</script>

<div class="text-center py-8 text-red-600 dark:text-red-400">
	<p>데이터를 불러오는 중 오류가 발생했습니다.</p>
	<p class="text-sm mt-2">{error.toString()}</p>
	<button on:click={() => window.location.reload()} class="mt-4 px-4 py-2 bg-neutral-800 dark:bg-neutral-300 text-white dark:text-neutral-800 text-sm hover:bg-neutral-700 dark:hover:bg-neutral-200" aria-label="페이지 새로고침">
		다시 시도
	</button>
</div>