<script lang="ts">
	import Spinner from './Spinner.svelte';

	let {
		compact = false,
		fill = false
	}: {
		compact?: boolean;
		/** Fill the viewport below the header — nav pending, no page chrome. */
		fill?: boolean;
	} = $props();

	// compact: disclosure / nested fetch. fill: route pending, no page
	// chrome. default: in-page query, optically centered in the content well.
</script>

<div
	class={[
		'print:hidden flex items-center justify-center text-foreground',
		compact && 'py-6',
		fill && 'min-h-[calc(100svh-3.5rem-var(--sat)-var(--sab))] pb-8',
		!compact && !fill && 'min-h-[min(24rem,calc(100svh-8.5rem))] pb-8'
	]}
	role="status"
	aria-live="polite"
	aria-busy="true"
>
	<Spinner size={compact ? 'md' : 'lg'} />
	<span class="sr-only">불러오는 중</span>
</div>
