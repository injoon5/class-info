import { cubicIn, cubicOut, expoOut, linear } from 'svelte/easing';
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
//
// ── Reveals ─────────────────────────────────────────────────────────────────
// Every box that opens does the same two things: the height slides, and the
// content rises the last few pixels into place behind it (`reveal`). Content
// that sits at its final position while the edge sweeps past it is a curtain
// going up — the box moves and nothing in it does. Closing is not the mirror
// image: the content fades out where it stands and the height follows it, so
// nothing is still legible while the box is shutting on it.

function ms(duration: number): number {
	return prefersReducedMotion.current ? 0 : duration;
}

/** Tween duration that collapses under reduced motion. */
export function tweenMs(duration: number): () => number {
	return () => ms(duration);
}

export const tweenMove = { duration: tweenMs(300), easing: expoOut };
/** Entrance: panel scale/fade and the desktop scrim tween over this long. */
export const PANEL_OPEN_MS = 360;
export const tweenPanel = { duration: tweenMs(PANEL_OPEN_MS), easing: expoOut };
/** Dismiss: shorter, accelerates off-screen so it doesn't hang at the end. */
export const PANEL_CLOSE_MS = 180;
export const tweenPanelClose = { duration: tweenMs(PANEL_CLOSE_MS), easing: cubicIn };
export const tweenFade = { duration: tweenMs(200), easing: expoOut };
export const tweenCaret = { duration: tweenMs(200), easing: expoOut };

/** True while the user has asked for reduced motion. */
export function reducedMotion(): boolean {
	return prefersReducedMotion.current;
}

// ── Springs, for the one surface a finger drives ────────────────────────────
// A sheet under a finger cannot use a fixed-duration tween. A tween ignores
// the speed the finger let go at and always takes the same time, so the sheet
// visibly *catches* at the release instead of carrying on — and it cannot be
// grabbed mid-flight without a jump, because it interpolates from where the
// animation began rather than from where the sheet actually is.
//
// Parameterised the way Apple's designers are given it (Designing Fluid
// Interfaces, WWDC 2018) rather than as mass/stiffness/damping:
//   damping  — 1 settles with no overshoot; below 1 overshoots and bounces.
//   response — roughly how long, in seconds, it takes to arrive. Not a
//              duration: the settle time falls out of the parameters.
// Bounce is only for motion a gesture threw; a sheet that merely appeared
// settles flat.

export interface SpringOptions {
	from: number;
	to: number;
	/** px per second, signed in screen coordinates. */
	velocity?: number;
	damping?: number;
	response?: number;
	/** Ends the spring the moment this is true of the value. For motion whose
	 *  target is off screen, where waiting out an oscillation nobody can see
	 *  only holds the page hostage. */
	until?: (value: number) => boolean;
	onFrame: (value: number) => void;
	onRest?: () => void;
}

/** Starts a spring and returns a stop handle. Under reduced motion it lands
 *  immediately — the value still arrives, it just doesn't travel. */
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

	const w = (2 * Math.PI) / response; // natural angular frequency
	const z = damping;
	const x0 = from - to; // displacement from rest
	const v0 = velocity;

	// Closed form, sampled against the wall clock every frame rather than
	// integrated step by step: a dropped frame then changes what gets drawn,
	// never where the spring has got to.
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

	const step = (now: number) => {
		if (stopped) return;
		const t = (now - start) / 1000;
		const d = displacement(t);
		if (until?.(to + d)) {
			onFrame(to + d);
			stopped = true;
			onRest?.();
			return;
		}
		// Rest when it is both within half a pixel and no longer moving enough
		// to cross one in the next few frames.
		if (Math.abs(d) < 0.5 && Math.abs(speed(t)) < 10) {
			onFrame(to);
			stopped = true;
			onRest?.();
			return;
		}
		onFrame(to + d);
		frame = requestAnimationFrame(step);
	};
	frame = requestAnimationFrame(step);

	return () => {
		stopped = true;
		if (frame) cancelAnimationFrame(frame);
	};
}

/**
 * Where a flick would come to rest if left to decay on its own, so an outcome
 * can be decided from where the gesture is *going* rather than from wherever
 * the finger happened to lift. Apple's exponential-decay projection, not the
 * textbook v²/2a. `velocity` in px/s, result in px.
 */
export function projectMomentum(velocity: number, deceleration = 0.998): number {
	return ((velocity / 1000) * deceleration) / (1 - deceleration);
}

/** Sheet settling after a throw — a touch of overshoot, because the gesture
 *  carried momentum into it. */
export const SHEET_SETTLE = { damping: 0.82, response: 0.32 };
/**
 * Sheet arriving on a tap. Under-damped, so it carries past its resting place
 * and comes back — the skirt under the panel is what that overshoot uncovers,
 * rather than a gap at the bottom of the screen.
 */
export const SHEET_PRESENT = { damping: 0.7, response: 0.34 };
/**
 * Sheet leaving. Under-damped again, which here buys speed rather than a
 * visible bounce: the overshoot is past the bottom of the screen, so what
 * shows is a sheet that leaves with more energy. The close ends at the screen
 * edge instead of waiting for that off-screen oscillation to decay.
 */
export const SHEET_DISMISS = { damping: 0.75, response: 0.24 };

/**
 * How far below its resting place revealed content starts. Small on purpose:
 * enough to read as arrival, not enough to look like a second layout change
 * happening next to the box's own.
 */
export const REVEAL_RISE = 8;

/**
 * Content arriving inside a box that is opening.
 *
 * A height slide on its own reads as a curtain going up: the content is
 * already sitting in its final place and the edge merely uncovers it. Here the
 * content starts a few pixels low and rises as the box opens, so it arrives
 * under its own steam instead of being revealed by something else. The rise
 * shares the height's `expoOut`, so the offset stays proportional to the
 * distance the box has left to travel and the two stop together — a separate
 * curve would have the content still drifting after the box had settled.
 *
 * Opacity is not on that curve. It waits out `fadeDelay` first, so the box is
 * most of the way open before anything is legible inside it: text fading in
 * across a two-pixel sliver is the part that reads as jitter. The defaults are
 * the delayed fade every reveal used to spell out for itself.
 *
 * Intro only. Leaving is a fade in place (`fadeOut`) — the content clears out
 * before the box collapses, and a rise on the way out only competes with it.
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

	// `linear`, because `t` has to stay the raw time fraction: the rise and the
	// fade are eased separately below, off the same clock.
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
