import { cubicIn, cubicOut, expoOut, linear } from 'svelte/easing';
import { prefersReducedMotion } from 'svelte/motion';
import type { EasingFunction, TransitionConfig } from 'svelte/transition';

// The app's motion vocabulary. Entrances ease `expoOut`, exits `cubicIn` (an
// outro runs the curve backwards, so `expoOut` there would snap), and anything
// that can reverse mid-flight `cubicOut`.
//
// Durations are getters read when a transition starts: Svelte animates through
// the Web Animations API, which the CSS reduced-motion override cannot reach.

function ms(duration: number): number {
	return prefersReducedMotion.current ? 0 : duration;
}

function tweenMs(duration: number): () => number {
	return () => ms(duration);
}

export function reducedMotion(): boolean {
	return prefersReducedMotion.current;
}

export const tweenMove = { duration: tweenMs(300), easing: expoOut };
export const PANEL_OPEN_MS = 360;
export const tweenPanel = { duration: tweenMs(PANEL_OPEN_MS), easing: expoOut };
export const PANEL_CLOSE_MS = 180;
export const tweenPanelClose = { duration: tweenMs(PANEL_CLOSE_MS), easing: cubicIn };
export const tweenFade = { duration: tweenMs(200), easing: expoOut };
export const tweenCaret = { duration: tweenMs(200), easing: expoOut };

// ── Springs, for the sheet a finger drives ──────────────────────────────────
// A tween ignores release velocity and can't be grabbed mid-flight, so the
// sheet uses a spring parameterised like Apple's (WWDC 2018 "Designing Fluid
// Interfaces"): `damping` 1 settles flat, below 1 bounces; `response` is
// roughly the time to arrive, in seconds.

export interface SpringOptions {
	from: number;
	to: number;
	/** px per second, signed in screen coordinates. */
	velocity?: number;
	damping?: number;
	response?: number;
	/** Ends the spring as soon as this holds, e.g. once it is off screen. */
	until?: (value: number) => boolean;
	onFrame: (value: number) => void;
	onRest?: () => void;
}

/** Starts a spring and returns a stop handle. Lands instantly under reduced motion. */
export function spring({
	from,
	to,
	velocity = 0,
	damping = 1,
	response = 0.4,
	until,
	onFrame,
	onRest
}: SpringOptions): () => void {
	if (reducedMotion() || response <= 0) {
		onFrame(to);
		onRest?.();
		return () => {};
	}

	const w = (2 * Math.PI) / response;
	const z = damping;
	const x0 = from - to;
	const v0 = velocity;

	// Closed form sampled against the clock, so a dropped frame never changes
	// where the spring is — only what gets drawn.
	let displacement: (t: number) => number;
	let speed: (t: number) => number;

	if (z < 1) {
		const wd = w * Math.sqrt(1 - z * z);
		const a = x0;
		const b = (v0 + z * w * x0) / wd;
		displacement = (t) => Math.exp(-z * w * t) * (a * Math.cos(wd * t) + b * Math.sin(wd * t));
		speed = (t) =>
			Math.exp(-z * w * t) *
			((b * wd - z * w * a) * Math.cos(wd * t) - (a * wd + z * w * b) * Math.sin(wd * t));
	} else {
		const a = x0;
		const b = v0 + w * x0;
		displacement = (t) => (a + b * t) * Math.exp(-w * t);
		speed = (t) => (b - w * (a + b * t)) * Math.exp(-w * t);
	}

	const start = performance.now();
	let frame = 0;
	let stopped = false;

	const finish = (value: number) => {
		onFrame(value);
		stopped = true;
		onRest?.();
	};

	const step = (now: number) => {
		if (stopped) return;
		const t = (now - start) / 1000;
		const d = displacement(t);
		if (until?.(to + d)) return finish(to + d);
		if (Math.abs(d) < 0.5 && Math.abs(speed(t)) < 10) return finish(to);
		onFrame(to + d);
		frame = requestAnimationFrame(step);
	};
	frame = requestAnimationFrame(step);

	return () => {
		stopped = true;
		if (frame) cancelAnimationFrame(frame);
	};
}

/** Where a flick would come to rest (Apple's exponential decay). px/s in, px out. */
export function projectMomentum(velocity: number, deceleration = 0.998): number {
	return ((velocity / 1000) * deceleration) / (1 - deceleration);
}

/** After a throw: a touch of overshoot, since the gesture carried momentum. */
export const SHEET_SETTLE = { damping: 0.82, response: 0.32 };
/** On a tap: bouncy arrival; the skirt under the panel covers the overshoot. */
export const SHEET_PRESENT = { damping: 0.7, response: 0.34 };
/** Leaving: the overshoot happens off screen, so it reads as speed. */
export const SHEET_DISMISS = { damping: 0.75, response: 0.24 };

export const REVEAL_RISE = 8;

/**
 * Content arriving inside a box that is opening: it rises the last few pixels
 * on the same `expoOut` as the height, and fades in only once the box is most
 * of the way open. Intro only; pair with `fadeOut` for the exit.
 */
export function reveal(
	_node: Element,
	{
		y = REVEAL_RISE,
		duration = 300,
		delay = 0,
		fadeDelay = 80,
		fadeDuration = 200
	}: {
		y?: number;
		duration?: number;
		delay?: number;
		fadeDelay?: number;
		fadeDuration?: number;
	} = {}
): TransitionConfig {
	const total = ms(duration);
	if (total === 0) return { duration: 0 };

	const fadeStart = ms(fadeDelay);
	const fadeSpan = ms(fadeDuration);

	return {
		delay: ms(delay),
		duration: total,
		easing: linear,
		css: (t: number) => {
			const rise = (1 - expoOut(t)) * y;
			const faded = fadeSpan > 0 ? (t * total - fadeStart) / fadeSpan : 1;
			const opacity = expoOut(Math.min(Math.max(faded, 0), 1));
			return `transform: translate3d(0, ${rise.toFixed(2)}px, 0); opacity: ${opacity.toFixed(3)};`;
		}
	};
}

export const fadeFast = {
	get duration() { return ms(100); },
	easing: cubicOut
};
export const fadeOut = {
	get duration() { return ms(120); },
	easing: cubicIn
};
export const slideY = {
	get duration() { return ms(300); },
	easing: expoOut
};
export const slideYOut = {
	get duration() { return ms(200); },
	easing: cubicIn
};
export const slideX = {
	axis: 'x' as const,
	get duration() { return ms(300); },
	easing: cubicOut
};
export const slideYBoth = {
	get duration() { return ms(300); },
	easing: cubicOut
};
/** Waits for a sibling leaving the same grid cell, so the two never overlap. */
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
 * Fade with a soft blur, for labels inside a clipping box where a `fly`
 * would be sliced by the clip edge.
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
