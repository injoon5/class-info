import { ConvexError } from 'convex/values';
import { invalidateAll } from '$app/navigation';

// Must match UNAUTHORIZED in packages/backend/convex/auth.ts.
const UNAUTHORIZED = 'Unauthorized';

export function isUnauthorized(err: unknown): boolean {
	return err instanceof ConvexError && err.data === UNAUTHORIZED;
}

/**
 * The message to show for a failed admin mutation. A server-side ConvexError
 * carries a message written for the reader; anything else gets `fallback`.
 * An expired session reloads the page data, which clears the cookie and
 * brings back the PIN screen, instead of failing every save the same way.
 */
export function adminErrorMessage(err: unknown, fallback: string): string {
	if (isUnauthorized(err)) {
		void invalidateAll();
		return '로그인이 만료됐어요. 다시 로그인해 주세요.';
	}
	if (err instanceof ConvexError && typeof err.data === 'string') return err.data;
	return fallback;
}
