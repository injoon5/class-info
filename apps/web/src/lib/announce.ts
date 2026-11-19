// The root layout renders one polite live region with this id.
export const LIVE_REGION_ID = 'aria-live-region';

/** Reads `message` out to screen readers through the layout's live region. */
export function announce(message: string): void {
	const region = document.getElementById(LIVE_REGION_ID);
	if (region) region.textContent = message;
}
