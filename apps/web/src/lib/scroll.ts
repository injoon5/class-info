// iOS Safari doesn't clamp scrollTop when content shrinks until the next
// touch, so a collapsing panel can strand the page past its new bottom.
//
// While a finger is down the browser owns the scroll position: writing to it
// mid-gesture is overwritten or kills momentum. Callers stand down during a
// touch, and the skipped clamp runs when the touch ends.

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

/** True while a touch owns the scroll; records that a clamp is owed on release. */
export function scrollIsTouchDriven(): boolean {
	listen();
	if (touching) deferredClamp = true;
	return touching;
}

export function scrollingEl(): Element {
	return document.scrollingElement ?? document.documentElement;
}

/** Top of the visual viewport (offset by the keyboard or pinch zoom). */
export function visibleTop(): number {
	return typeof window === 'undefined' ? 0 : (window.visualViewport?.offsetTop ?? 0);
}

export function clampWindowScroll(): void {
	const el = scrollingEl();
	const max = Math.max(0, el.scrollHeight - window.innerHeight);
	if (el.scrollTop > max) el.scrollTop = max;
}

/** Keeps the viewport locked to collapsing content for one transition. */
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
