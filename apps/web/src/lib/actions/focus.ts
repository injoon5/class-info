import { reducedMotion } from '$lib/transitions';

// Focuses an element when it is revealed. `delay` waits out a height slide so
// the focus ring isn't clipped by the opening box.
export function focusOnElement(node: HTMLElement, delay: number = 0) {
	// On touch devices a delayed programmatic focus loses the user gesture:
	// the field ends up focused with no keyboard, and the next tap does nothing.
	if (window.matchMedia('(pointer: coarse)').matches) return {};

	if (reducedMotion() || delay <= 0) {
		node.focus();
		return {};
	}
	const timer = setTimeout(() => node.focus(), delay);
	return {
		destroy() {
			clearTimeout(timer);
		}
	};
}
