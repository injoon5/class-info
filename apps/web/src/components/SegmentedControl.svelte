<script lang="ts">
import { Tween } from 'svelte/motion';
import { tweenMove } from '$lib/transitions';

// Two-option sliding segmented control (timetable week + meal type toggles).
type Value = string | number;
type Option = { value: Value; label: string; event?: string; eventProps?: string };

let {
	options,
	value = $bindable(),
	onchange
}: { options: [Option, Option]; value: Value; onchange?: (v: Value) => void } = $props();

const activeIndex = $derived(options.findIndex((o) => o.value === value));
const thumbX = Tween.of(() => activeIndex * 100, tweenMove);

function select(v: Value) {
	value = v;
	onchange?.(v);
}
</script>

<div class="flex justify-center">
	<div class="relative flex w-full rounded-xl bg-muted p-1 h-10 sm:h-11 text-sm sm:text-base">
		<div
			class="absolute top-1 h-8 sm:h-9 w-[calc(50%-0.25rem)] rounded-lg bg-elevated shadow-sm dark:shadow-none z-0"
			style="transform: translateX({thumbX.current}%)"
			aria-hidden="true"
		></div>
		{#each options as option (option.value)}
			<button
				class="flex-1 relative z-10 px-3 py-1 rounded-lg font-semibold transition-colors duration-150
					{value === option.value ? 'text-foreground' : 'text-muted-foreground pointer:hover:text-foreground'}"
				onclick={() => select(option.value)}
				aria-pressed={value === option.value}
				type="button"
				data-s-event={option.event}
				data-s-event-props={option.eventProps}
			>{option.label}</button>
		{/each}
	</div>
</div>
