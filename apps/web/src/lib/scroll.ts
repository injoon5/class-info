// iOS Safari does not clamp scrollTop when content shrinks until the next
// touch. A collapsing editor/drawer then leaves the page in a dead zone.

// ── A gesture owns the scroll position ──────────────────────────────────────
// While a finger is on the glass the browser applies its own scroll offset for
// the whole gesture, so a scrollTop write from an animation lands in the middle
// of it: mid-drag it is overwritten on the next frame, and on a flick it stops
// the momentum dead. Anything compensating for collapsing content sits the
// gesture out instead — and the touch ending is exactly when iOS settles the
// position itself, which is the case the clamp was written for. Whatever was
// skipped is clamped there.

let touching = false;
let deferredClamp = false;
let listening = false;

function listen(): void {
	if (listening || typeof window === 'undefined') return;
	listening = true;
	const opts = { passive: true, capture: true } as const;
	window.addEventListener('touchstart', () => { touching = true; }, opts);
	const release = () => {
		touching = false;
		if (!deferredClamp) return;
		deferredClamp = false;
		clampWindowScroll();
	};
	window.addEventListener('touchend', release, opts);
	window.addEventListener('touchcancel', release, opts);
}

/**
 * True while a touch owns the scroll position, and no animation should be
 * writing to it. Asking also records that something stood down, so the clamp
 * it skipped happens when the touch ends.
 */
export function scrollIsTouchDriven(): boolean {
	listen();
	if (touching) deferredClamp = true;
	return touching;
}

export function scrollingEl(): Element {
	return document.scrollingElement ?? document.documentElement;
}

/**
 * The top of what the reader can actually see, in the same coordinates as
 * `getBoundingClientRect()`. On a phone the visual viewport is offset from the
 * layout viewport whenever the keyboard is up or the page is pinch-zoomed, so
 * plain `0` is the top of the wrong box.
 */
export function visibleTop(): number {
	return typeof window === 'undefined' ? 0 : (window.visualViewport?.offsetTop ?? 0);
}

export function clampWindowScroll(): void {
	const el = scrollingEl();
	const max = Math.max(0, el.scrollHeight - window.innerHeight);
	if (el.scrollTop > max) el.scrollTop = max;
}

/** Keep the viewport locked to collapsing content for one transition. */
export function followCollapsing(node: HTMLElement | null, durationMs = 220): void {
	if (!node || typeof requestAnimationFrame === 'undefined') {
		clampWindowScroll();
		return;
	}

	const target = node;
	let lastH = target.offsetHeight;
	const start = performance.now();

	function frame(now: number) {
		const h = target.isConnected ? target.offsetHeight : 0;
		const dh = lastH - h;
		lastH = h;
		// Same rule as above: a finger on the glass outranks the animation.
		if (!scrollIsTouchDriven()) {
			if (dh > 0) {
				const el = scrollingEl();
				el.scrollTop = Math.max(0, el.scrollTop - dh);
			}
			clampWindowScroll();
		}
		if (now - start < durationMs) requestAnimationFrame(frame);
	}

	requestAnimationFrame(frame);
}
