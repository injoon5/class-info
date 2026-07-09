<script lang="ts" generics="T extends string | number">
// iOS-style segmented control: a single sliding thumb, instant label
// feedback, spring-feel motion. The thumb always animates from its
// current position, so rapid switching stays continuous.
interface Option<V> {
	value: V;
	label: string;
	sEventProps?: string;
}

interface Props {
	options: Option<T>[];
	value: T;
	onchange: (value: T) => void;
	label?: string;
	sEvent?: string;
}

let { options, value, onchange, label, sEvent }: Props = $props();

const selectedIndex = $derived(Math.max(0, options.findIndex((o) => o.value === value)));
</script>

<div
	class="relative flex w-full rounded-xl bg-neutral-950/[0.05] dark:bg-white/[0.07] p-1 h-10 sm:h-11"
	role="group"
	aria-label={label}
>
	<!-- Sliding thumb -->
	<div
		class="absolute top-1 bottom-1 rounded-[9px] bg-white dark:bg-neutral-700 shadow-[0_1px_4px_rgb(0_0_0/0.09),0_0_0.5px_rgb(0_0_0/0.14)] dark:shadow-[0_1px_4px_rgb(0_0_0/0.35)] transition-transform duration-300 ease-spring z-0"
		style="width: calc((100% - 0.5rem) / {options.length}); transform: translateX({selectedIndex * 100}%);"
		aria-hidden="true"
	></div>

	{#each options as option}
		{@const selected = option.value === value}
		<button
			type="button"
			class="flex-1 relative z-10 px-3 rounded-[9px] text-sm sm:text-[15px] transition-[color,font-weight] duration-150 min-w-0 truncate
				{selected
					? 'font-semibold text-neutral-900 dark:text-white'
					: 'font-medium text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300 active:opacity-60'}"
			onclick={() => onchange(option.value)}
			aria-pressed={selected}
			data-s-event={sEvent}
			data-s-event-props={option.sEventProps}
		>{option.label}</button>
	{/each}
</div>
