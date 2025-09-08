<script lang="ts">
	import '../app.css';
    import Header from '../components/Header.svelte';
    import { PUBLIC_CONVEX_URL } from '$env/static/public';
	import { setupConvex } from 'convex-svelte';

	const { children } = $props();
	setupConvex(PUBLIC_CONVEX_URL);
</script>

<div class="grid h-svh grid-rows-[auto_1fr]">
	<Header />
	<main class="overflow-y-auto">
		{@render children()}
	</main>
</div>
