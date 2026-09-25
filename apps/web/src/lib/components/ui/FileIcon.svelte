<script lang="ts">
// `mime` picks image vs document; `attachment` is the small "has files" mark.
const { mime, attachment = false, class: className = '' }: { mime?: string; attachment?: boolean; class?: string } =
	$props();
</script>

<svg class={className} fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
	{#if attachment}
		<path
			fill-rule="evenodd"
			d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
			clip-rule="evenodd"
		/>
	{:else if mime?.startsWith('image/')}
		<path
			fill-rule="evenodd"
			d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"
			clip-rule="evenodd"
		/>
	{:else}
		<path
			fill-rule="evenodd"
			d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"
			clip-rule="evenodd"
		/>
	{/if}
</svg>
