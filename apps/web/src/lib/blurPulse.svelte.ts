// Briefly blurs a region when a selection changes (skips the initial mount).
// Usage:
//   const blur = createBlurPulse();
//   $effect(() => { selectedThing; blur.pulse(); });
//   <HScroll blurred={blur.blurred}> … </HScroll>
export function createBlurPulse(durationMs = 200) {
	let blurred = $state(false);
	let timer: ReturnType<typeof setTimeout> | null = null;
	let primed = false;

	return {
		get blurred() {
			return blurred;
		},
		pulse() {
			if (!primed) {
				primed = true;
				return;
			}
			blurred = true;
			if (timer !== null) clearTimeout(timer);
			timer = setTimeout(() => {
				blurred = false;
				timer = null;
			}, durationMs);
		}
	};
}
