// iOS Safari does not clamp scrollTop when content shrinks until the next
// touch. A collapsing editor/drawer then leaves the page in a dead zone.

export function clampWindowScroll(): void {
	const el = document.scrollingElement ?? document.documentElement;
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
		if (dh > 0) {
			const el = document.scrollingElement ?? document.documentElement;
			el.scrollTop = Math.max(0, el.scrollTop - dh);
		}
		clampWindowScroll();
		if (now - start < durationMs) requestAnimationFrame(frame);
	}

	requestAnimationFrame(frame);
}
