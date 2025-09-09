<script lang="ts">
	import '../app.css';
    import { PUBLIC_CONVEX_URL } from '$env/static/public';
	import { setupConvex } from 'convex-svelte';
	import { onMount } from 'svelte';

	const { children } = $props();
	
	// Set up Convex client
	setupConvex(PUBLIC_CONVEX_URL);
	
	// Ensure Convex is set up on mount for hard refreshes
	onMount(() => {
		setupConvex(PUBLIC_CONVEX_URL);
	});
</script>

<div class="grid h-svh grid-rows-[auto_1fr] subpixel-antialiased break-keep">
	<main class="">
		{@render children()}
	</main>
	
</div>
