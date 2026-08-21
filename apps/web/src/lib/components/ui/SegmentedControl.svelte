<script lang="ts" generics="Value extends string | number">
import { Tween } from 'svelte/motion';
import { tweenMove } from '$lib/transitions';

// Sliding segmented control (timetable week/전체 + meal type toggles). Any
// number of segments: they share the track equally, and the thumb is one
// segment wide, so it travels exactly 100% of itself per step.
type Option = { value: Value; label: string; event?: string; eventProps?: string };

let {
	options,
	value = $bindable(),
	onchange
}: { options: Option[]; value: Value; onchange?: (v: Value) => void } = $props();

// A value that matches no option (a meal type that stopped being served while
// it was selected) leaves `findIndex` at -1, which sent the thumb sliding a
// full width off the left edge of the track. Hold the first segment until the
// owner reconciles the value.
const activeIndex = $derived(Math.max(0, options.findIndex((o) => o.value === value)));
const thumbX = Tween.of(() => activeIndex * 100, tweenMove);
// The track's p-1 is inside the percentage the thumb resolves against, so the
// padding has to come out of the share before it is divided.
const thumbWidth = $derived(`calc((100% - 0.5rem) / ${Math.max(1, options.length)})`);

function select(v: Value) {
	value = v;
	onchange?.(v);
}
</script>

<div class="flex justify-center">
	<div class="relative flex w-full rounded-xl bg-muted p-1 h-10 sm:h-11 text-sm sm:text-base">
		<div
			class="absolute top-1 h-8 sm:h-9 rounded-lg bg-elevated shadow-sm dark:shadow-none z-0"
			style="width: {thumbWidth}; transform: translateX({thumbX.current}%)"
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
