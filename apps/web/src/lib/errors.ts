import { ConvexError } from 'convex/values';
import { refreshAll } from '$app/navigation';
import { UNAUTHORIZED } from '@class-info/backend/convex/validators';

/**
 * The message to show for a failed admin mutation. A server-side ConvexError
 * carries a message written for the reader; anything else gets `fallback`.
 * An expired session reloads the page data, which clears the cookie and
 * brings back the PIN screen, instead of failing every save the same way.
 */
export function adminErrorMessage(err: unknown, fallback: string): string {
	if (!(err instanceof ConvexError)) return fallback;
	if (err.data === UNAUTHORIZED) {
		void refreshAll();
		return '로그인이 만료됐어요. 다시 로그인해 주세요.';
	}
	return typeof err.data === 'string' ? err.data : fallback;
}
