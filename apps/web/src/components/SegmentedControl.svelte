<script lang="ts">
// Two-option sliding segmented control (timetable week + meal type toggles).
type Value = string | number;
type Option = { value: Value; label: string; event?: string; eventProps?: string };

let {
	options,
	value = $bindable(),
	onchange
}: { options: [Option, Option]; value: Value; onchange?: (v: Value) => void } = $props();

const activeIndex = $derived(options.findIndex((o) => o.value === value));

function select(v: Value) {
	value = v;
	onchange?.(v);
}
</script>

<div class="flex justify-center">
	<div class="relative flex w-full rounded-xl bg-neutral-200 dark:bg-neutral-800 p-1 shadow-inner transition-colors h-9 sm:h-11 text-sm sm:text-base">
		<div
			class="absolute top-1 h-7 sm:h-9 w-[calc(50%-0.25rem)] rounded-lg bg-white dark:bg-neutral-700 shadow transition-transform duration-300 ease-in-out z-0"
			style="transform: translateX({activeIndex * 100}%);"
			aria-hidden="true"
		></div>
		{#each options as option}
			<button
				class="flex-1 relative z-10 px-3 py-1 rounded-lg font-medium transition-colors
					{value === option.value ? 'text-neutral-900 dark:text-neutral-100' : 'text-neutral-600 dark:text-neutral-300'}"
				onclick={() => select(option.value)}
				aria-pressed={value === option.value}
				type="button"
				data-s-event={option.event}
				data-s-event-props={option.eventProps}
			>{option.label}</button>
		{/each}
	</div>
</div>
