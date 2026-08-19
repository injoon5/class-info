import { expoOut } from 'svelte/easing';
import type { EasingFunction, TransitionConfig } from 'svelte/transition';

/**
 * Fade a label in or out while it softens.
 *
 * Used where the element sits inside a clipping box (a morphing button), which
 * rules out moving it: a `fly` there gets sliced by the clip edge and the hard
 * cut through the glyphs is more distracting than the swap it was meant to
 * soften. Blur dissolves instead of cutting, so the box can keep clipping the
 * width while the label reads as fading out of focus.
 */
export function blurFade(
	_node: Element,
	{ duration = 200, easing = expoOut, blur = 4, delay = 0 }: {
		duration?: number;
		easing?: EasingFunction;
		blur?: number;
		delay?: number;
	} = {}
): TransitionConfig {
	return {
		delay,
		duration,
		easing,
		css: (t: number, u: number) => `opacity: ${t}; filter: blur(${(u * blur).toFixed(2)}px);`
	};
}
