<script lang="ts">
import { SITE_NAME, SITE_URL } from '@class-info/backend/convex/config';

const {
	title,
	description,
	path,
	type = 'website',
	robots
}: {
	title: string;
	description: string;
	/** Absolute path for og:url; omitted when the page has no canonical URL. */
	path?: string;
	type?: 'website' | 'article';
	robots?: string;
} = $props();
</script>

<svelte:head>
	<title>{title}</title>
	<meta name="description" content={description} />
	<meta property="og:title" content={title} />
	<meta property="og:description" content={description} />
	{#if path !== undefined}
		<meta property="og:url" content="{SITE_URL}{path === '/' ? '' : path}" />
	{/if}
	<meta property="og:type" content={type} />
	<meta property="og:site_name" content={SITE_NAME} />
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={title} />
	<meta name="twitter:description" content={description} />
	{#if robots}
		<meta name="robots" content={robots} />
	{/if}
</svelte:head>
