import { reducedMotion } from '$lib/transitions';

// Briefly blurs a region when a selection changes (skipping the first call,
// which is the initial mount). Create during component init.
//
//   const blur = createBlurPulse();
//   $effect(() => { selected; blur.pulse(); });
//   <div style={blur.style}>…</div>
export function createBlurPulse(durationMs = 200) {
	let blurred = $state(false);
	let timer: ReturnType<typeof setTimeout> | null = null;
	let primed = false;

	$effect(() => () => {
		if (timer !== null) clearTimeout(timer);
		timer = null;
	});

	return {
		get blurred() {
			return blurred;
		},
		get style() {
			return `transition: filter 150ms ease-out, opacity 150ms ease-out;${blurred ? ' filter: blur(4px); opacity: 0.7;' : ''}`;
		},
		pulse() {
			if (!primed) {
				primed = true;
				return;
			}
			// The reduced-motion override drops `filter` transitions, so the blur
			// would snap instead of easing. Skip it.
			if (reducedMotion()) return;
			blurred = true;
			if (timer !== null) clearTimeout(timer);
			timer = setTimeout(() => {
				blurred = false;
				timer = null;
			}, durationMs);
		}
	};
}
