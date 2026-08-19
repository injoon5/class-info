import { ConvexHttpClient } from 'convex/browser';
import { PUBLIC_CONVEX_URL } from '$env/static/public';

// Vite copies CONVEX_URL (set by `npx convex deploy --cmd`) onto PUBLIC_CONVEX_URL
// before this module is compiled. See vite.config.ts.
export function getConvexUrl(): string {
	if (!PUBLIC_CONVEX_URL) throw new Error('Missing PUBLIC_CONVEX_URL');
	return PUBLIC_CONVEX_URL;
}

export function convexHttp(): ConvexHttpClient {
	return new ConvexHttpClient(getConvexUrl());
}
