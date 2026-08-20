import { reducedMotion } from '$lib/transitions';

// Focus an element the moment it is revealed. An action rather than an
// $effect, so the intent lives on the element and $effect stays reserved for
// syncing external state.
//
// `delay` exists for elements revealed by a height animation: a slide clips its
// own content while it opens, so a focus ring drawn on frame one gets sliced by
// that clip edge. Waiting for the animation lets the ring land on a control
// that is fully on screen.
export function focusOnElement(node: HTMLElement, delay: number = 0) {
	// iOS drops the user-gesture token after a timeout, then a programmatic
	// focus "succeeds" with no keyboard — and the next tap does nothing
	// because the field is already focused.
	if (window.matchMedia('(pointer: coarse)').matches) return {};

	// The delay only exists to outlast an animation. With motion reduced there
	// is no animation to outlast, and waiting would just leave the field
	// unfocused for no reason.
	if (reducedMotion()) delay = 0;

	if (delay <= 0) {
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
