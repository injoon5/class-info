<script lang="ts">
	// 14 / 16 / 20. Stroke stays 1.5px at every size so the mark doesn't
	// turn into a doughnut as it grows. No track — the arc is the whole thing.
	const SIZES = { sm: 14, md: 16, lg: 20 } as const;

	let {
		size = 'lg',
		class: className = ''
	}: {
		size?: keyof typeof SIZES;
		class?: string;
	} = $props();

	const px = $derived(SIZES[size]);
</script>

<span
	class={['inline-flex shrink-0', className]}
	style:width="{px}px"
	style:height="{px}px"
	aria-hidden="true"
>
	<svg class="spinner-mark block size-full overflow-visible" viewBox="0 0 24 24" fill="none">
		<circle
			class="spinner-lead"
			cx="12"
			cy="12"
			r="9"
			pathLength="100"
			stroke="currentColor"
			stroke-linecap="round"
			transform="rotate(-90 12 12)"
		/>
	</svg>
</span>
