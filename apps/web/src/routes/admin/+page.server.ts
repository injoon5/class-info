import type { PageServerLoad, Actions } from './$types';
import { redirect } from '@sveltejs/kit';
import { api } from '@class-info/backend/convex/_generated/api';
import { schoolClock } from '@class-info/backend/convex/dates';
import { PIN_PATTERN } from '@class-info/backend/convex/validators';
import { getAdminSession, SESSION_COOKIE, SESSION_MAX_AGE } from '#lib/server/auth.js';
import { convexHttp, orFallback } from '#lib/convex.js';

export const load: PageServerLoad = async ({ cookies }) => {
	const session = await getAdminSession(cookies);
	const clock = schoolClock();
	// Only the authenticated panel renders the list, so the PIN screen skips it.
	const overview = session.isAuthenticated
		? await orFallback(convexHttp().query(api.notices.overview, clock), undefined, 'admin overview')
		: undefined;
	return { ...session, overview, clock };
};

export const actions: Actions = {
	login: async ({ request, cookies, url }) => {
		const data = await request.formData();
		const pinValue = data.get('pin');
		const pin = typeof pinValue === 'string' ? pinValue : '';
		if (!PIN_PATTERN.test(pin)) {
			return { success: false, error: '잘못된 PIN입니다' };
		}

		try {
			const result = await convexHttp().mutation(api.settings.login, { pin });
			if (result.ok) {
				cookies.set(SESSION_COOKIE, result.token, {
					path: '/',
					maxAge: SESSION_MAX_AGE,
					sameSite: 'strict',
					secure: url.protocol === 'https:',
					httpOnly: true
				});
				return { success: true };
			}
		} catch {
			// fall through to the generic error
		}

		return { success: false, error: '잘못된 PIN입니다' };
	},

	logout: async ({ cookies, url }) => {
		const token = cookies.get(SESSION_COOKIE);
		if (token) {
			try {
				await convexHttp().mutation(api.settings.logout, { token });
			} catch {
				// best-effort server-side revocation
			}
		}
		cookies.delete(SESSION_COOKIE, {
			path: '/',
			sameSite: 'strict',
			secure: url.protocol === 'https:'
		});
		redirect(302, '/');
	}
};
