import type { Cookies } from '@sveltejs/kit';
import { api } from '@class-info/backend/convex/_generated/api';
import { convexHttp } from '#lib/convex.js';
import { ADMIN_SESSION_TTL_MS } from '@class-info/backend/convex/validators';

export const SESSION_COOKIE = 'admin_session';

function cookieOptions(url: URL) {
	return { path: '/', sameSite: 'strict', secure: url.protocol === 'https:', httpOnly: true } as const;
}

export function setSessionCookie(cookies: Cookies, url: URL, token: string): void {
	cookies.set(SESSION_COOKIE, token, { ...cookieOptions(url), maxAge: ADMIN_SESSION_TTL_MS / 1000 });
}

export function clearSessionCookie(cookies: Cookies, url: URL): void {
	cookies.delete(SESSION_COOKIE, cookieOptions(url));
}

/**
 * Resolve the admin session from the request cookies.
 *
 * The token lives in an httpOnly cookie (page-guard) and is validated against
 * Convex on every request. When valid we also return the raw token so the
 * authenticated page can hand it to privileged client-side mutations. Invalid
 * or expired tokens get the cookie cleared.
 */
export async function getAdminSession(
	cookies: Cookies,
	url: URL
): Promise<{ isAuthenticated: boolean; sessionToken: string | null }> {
	const token = cookies.get(SESSION_COOKIE);
	if (!token) return { isAuthenticated: false, sessionToken: null };

	try {
		const valid = await convexHttp().mutation(api.settings.verifySession, { token });
		if (valid) return { isAuthenticated: true, sessionToken: token };
	} catch {
		// A backend hiccup keeps the cookie so it doesn't force a re-login.
		return { isAuthenticated: false, sessionToken: null };
	}

	clearSessionCookie(cookies, url);
	return { isAuthenticated: false, sessionToken: null };
}
