import { expoOut } from 'svelte/easing';
import { prefersReducedMotion } from 'svelte/motion';
import type { EasingFunction, TransitionConfig } from 'svelte/transition';

// One motion vocabulary. Enter/exit/move go through Svelte (`transition`,
// `in`/`out`, `animate:flip`, `Tween`) with `expoOut`. CSS keeps hover/press
// (`duration-150 ease-out`) and the spinner — those aren't journeys.

function ms(duration: number): number {
	return prefersReducedMotion.current ? 0 : duration;
}

/** Tween duration that collapses under reduced motion. */
export function tweenMs(duration: number): () => number {
	return () => ms(duration);
}

export const tweenMove = { duration: tweenMs(300), easing: expoOut };
export const tweenPanel = { duration: tweenMs(400), easing: expoOut };
export const tweenFade = { duration: tweenMs(200), easing: expoOut };
export const tweenCaret = { duration: tweenMs(200), easing: expoOut };

export const fadeFast = { duration: 100 };
export const fadeIn = { duration: 200, delay: 80 };
export const fadeOut = { duration: 120 };
export const slideY = { duration: 300, easing: expoOut };
export const slideX = { axis: 'x' as const, duration: 300, easing: expoOut };
export const slideXOut = { axis: 'x' as const, duration: 200, easing: expoOut };
export const slideNone = { duration: 0 };
export const flyIn = { y: 10, duration: 300 };
export const flyHelper = { y: 3, duration: 150 };
export const flipMove = { duration: 300, easing: expoOut };

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
	{
		duration = 200,
		easing = expoOut,
		blur = 4,
		delay = 0
	}: {
		duration?: number;
		easing?: EasingFunction;
		blur?: number;
		delay?: number;
	} = {}
): TransitionConfig {
	return {
		delay,
		duration: ms(duration),
		easing,
		css: (t: number, u: number) => `opacity: ${t}; filter: blur(${(u * blur).toFixed(2)}px);`
	};
}
