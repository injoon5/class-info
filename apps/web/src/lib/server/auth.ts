import type { Cookies } from '@sveltejs/kit';
import { api } from '@class-info/backend/convex/_generated/api';
import { convexHttp } from '$lib/convex';

export const SESSION_COOKIE = 'admin_session';
export const SESSION_MAX_AGE = 60 * 60 * 24; // 24h, matches the Convex session TTL

/**
 * Resolve the admin session from the request cookies.
 *
 * The token lives in an httpOnly cookie (page-guard) and is validated against
 * Convex on every request. When valid we also return the raw token so the
 * authenticated page can hand it to privileged client-side mutations. Invalid
 * or expired tokens get the cookie cleared.
 */
export async function getAdminSession(
  cookies: Cookies
): Promise<{ isAuthenticated: boolean; sessionToken: string | null }> {
  const token = cookies.get(SESSION_COOKIE);
  if (!token) return { isAuthenticated: false, sessionToken: null };

	try {
		const valid = await convexHttp().mutation(api.settings.verifySession, { token });
		if (valid) return { isAuthenticated: true, sessionToken: token };
  } catch {
    // Network/backend hiccup — treat as unauthenticated but keep the cookie so
    // a transient failure doesn't force re-login.
    return { isAuthenticated: false, sessionToken: null };
  }

  cookies.delete(SESSION_COOKIE, { path: '/' });
  return { isAuthenticated: false, sessionToken: null };
}
