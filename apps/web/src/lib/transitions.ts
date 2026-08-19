import { cubicIn, cubicOut, expoOut } from 'svelte/easing';
import { prefersReducedMotion } from 'svelte/motion';
import type { EasingFunction, TransitionConfig } from 'svelte/transition';

// One motion vocabulary. Enter/exit/move go through Svelte (`transition`,
// `in`/`out`, `Tween`) with `expoOut`. CSS keeps hover/press
// (`duration-150 ease-out`) and the spinner — those aren't journeys.
//
// No FLIP anywhere. Svelte leaves an outgoing node in flow while it animates,
// so FLIP always measures the survivors a beat too early and then fights the
// collapse it was meant to carry; a height slide does that job on its own.
//
// ── Reduced motion ──────────────────────────────────────────────────────────
// Svelte drives `transition:`/`in:`/`out:` through the Web
// Animations API, which CSS `animation-duration` cannot reach — the
// `prefers-reduced-motion` block in app.css stops CSS animations only. So
// every duration and delay here is a getter that collapses to 0, read at the
// moment Svelte destructures the config (i.e. when the transition starts),
// which is also late enough to follow the setting changing mid-session.
//
// ── Easing direction ────────────────────────────────────────────────────────
// Svelte runs an outro as `t = 1 - easing(elapsed / duration)`. `expoOut` in
// that direction is a snap: `expoOut(0.1) === 0.5`, so half the distance is
// gone in a tenth of the time and the rest is an invisible tail. Entrances
// keep `expoOut`; exits take `cubicIn` so they accelerate away (the curve
// `tweenPanelClose` already uses); anything bidirectional takes `cubicOut`,
// which reads as motion in both directions.

function ms(duration: number): number {
	return prefersReducedMotion.current ? 0 : duration;
}

/** Tween duration that collapses under reduced motion. */
export function tweenMs(duration: number): () => number {
	return () => ms(duration);
}

export const tweenMove = { duration: tweenMs(300), easing: expoOut };
export const tweenPanel = { duration: tweenMs(360), easing: expoOut };
/** Dismiss: shorter, accelerates off-screen so it doesn't hang at the end. */
export const PANEL_CLOSE_MS = 180;
export const tweenPanelClose = { duration: tweenMs(PANEL_CLOSE_MS), easing: cubicIn };
export const tweenFade = { duration: tweenMs(200), easing: expoOut };
export const tweenCaret = { duration: tweenMs(200), easing: expoOut };

/** True while the user has asked for reduced motion. */
export function reducedMotion(): boolean {
	return prefersReducedMotion.current;
}

export const fadeFast = {
	get duration() { return ms(100); },
	easing: cubicOut
};
export const fadeIn = {
	get duration() { return ms(200); },
	get delay() { return ms(80); },
	easing: expoOut
};
export const fadeOut = {
	get duration() { return ms(120); },
	easing: cubicIn
};
/** Entrance height slide. */
export const slideY = {
	get duration() { return ms(300); },
	easing: expoOut
};
/** Exit height slide. */
export const slideYOut = {
	get duration() { return ms(200); },
	easing: cubicIn
};
/** Bidirectional width slide — one easing has to serve both directions. */
export const slideX = {
	axis: 'x' as const,
	get duration() { return ms(300); },
	easing: cubicOut
};
/** Bidirectional height slide, for panels that must reverse mid-flight. */
export const slideYBoth = {
	get duration() { return ms(300); },
	easing: cubicOut
};
/**
 * Enter only after a sibling has finished leaving the same grid cell.
 * Without the wait the arriving control paints on top of the one still
 * collapsing underneath it.
 */
export const fadeInAfter = {
	get duration() { return ms(150); },
	get delay() { return ms(160); },
	easing: expoOut
};
export const slideNone = { duration: 0 };
export const flyHelper = {
	y: 3,
	get duration() { return ms(150); },
	easing: expoOut
};
export const flyHelperOut = {
	y: -3,
	get duration() { return ms(120); },
	easing: cubicIn
};
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
		delay: ms(delay),
		duration: ms(duration),
		easing,
		css: (t: number, u: number) => `opacity: ${t}; filter: blur(${(u * blur).toFixed(2)}px);`
	};
}
