import { ConvexHttpClient } from 'convex/browser';
import { PUBLIC_CONVEX_URL } from '$app/env/public';

// Validated in src/env.ts, so a missing or malformed URL fails the build.
export function getConvexUrl(): string {
	return PUBLIC_CONVEX_URL;
}

// Pass the load's `fetch` from universal loads: SvelteKit inlines what it
// fetches during SSR, so hydration reuses it instead of querying again.
export function convexHttp(fetch?: typeof globalThis.fetch): ConvexHttpClient {
	return new ConvexHttpClient(getConvexUrl(), fetch ? { fetch } : undefined);
}

/** A failed query logs and yields `fallback`, so one bad source can't blank a page. */
export async function orFallback<T>(query: Promise<T>, fallback: T, label: string): Promise<T> {
	try {
		return await query;
	} catch (err) {
		console.error(label, err);
		return fallback;
	}
}
