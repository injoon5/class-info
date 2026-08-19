import type { PageServerLoad, Actions } from './$types';
import { redirect } from '@sveltejs/kit';
import { api } from '@class-info/backend/convex/_generated/api';
import { getAdminSession, SESSION_COOKIE, SESSION_MAX_AGE } from '$lib/server/auth';
import { convexHttp } from '$lib/convex';
import { noticeClock } from '$lib/date';

export const load: PageServerLoad = async ({ cookies }) => {
	const { isAuthenticated, sessionToken } = await getAdminSession(cookies);
	const clock = noticeClock();

	// Only the authenticated panel renders the list, so don't pay for it on the
	// PIN screen. A failure here is not fatal — the client query still runs.
	let overview = undefined;
	if (isAuthenticated) {
		try {
			overview = await convexHttp().query(api.notices.overview, clock);
		} catch {
			overview = undefined;
		}
	}

	return { isAuthenticated, sessionToken, overview, ...clock };
};

export const actions: Actions = {
	login: async ({ request, cookies, url }) => {
		const data = await request.formData();
		const pinValue = data.get('pin');
		const pin = typeof pinValue === 'string' ? pinValue : '';
		if (!/^\d{4,8}$/.test(pin)) {
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
		throw redirect(302, '/');
	}
};
