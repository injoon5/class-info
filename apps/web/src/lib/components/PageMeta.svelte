<script lang="ts">
	import { CLASS, siteUrl } from '$lib/site';

	let {
		title,
		description,
		path = '',
		robots,
		ogType = 'website'
	}: {
		title: string;
		description: string;
		path?: string;
		robots?: string;
		ogType?: 'website' | 'article';
	} = $props();

	const url = $derived(siteUrl(path));
</script>

<svelte:head>
	<title>{title}</title>
	<meta name="description" content={description} />
	<meta property="og:title" content={title} />
	<meta property="og:description" content={description} />
	<meta property="og:url" content={url} />
	<meta property="og:type" content={ogType} />
	<meta property="og:site_name" content={CLASS.site.name} />
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={title} />
	<meta name="twitter:description" content={description} />
	{#if robots}
		<meta name="robots" content={robots} />
	{/if}
</svelte:head>
