import { reducedMotion } from '$lib/transitions';

// Briefly blurs a region when a selection changes (skips the initial mount).
// Usage:
//   const blur = createBlurPulse();
//   $effect(() => { selectedThing; blur.pulse(); });
//   <div style={blur.blurred ? 'filter: blur(4px); …' : ''}> … </div>
//   (or pass blurred into HScroll where a row still pans)
//
// Call this during component initialisation: it registers a teardown so a
// pulse in flight cannot outlive the component that started it.
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
		pulse() {
			if (!primed) {
				primed = true;
				return;
			}
			// The pulse is decoration, and it is the one cue that gets *worse*
			// when motion is reduced: the app-wide transition override drops
			// `filter`, so the blur would snap on and off instead of easing.
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
