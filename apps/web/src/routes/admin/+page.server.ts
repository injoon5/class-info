import type { PageServerLoad, Actions } from './$types';
import { redirect } from '@sveltejs/kit';
import { api } from '@class-info/backend/convex/_generated/api';
import { schoolClock } from '@class-info/backend/convex/dates';
import { PIN_PATTERN } from '@class-info/backend/convex/validators';
import { clearSessionCookie, getAdminSession, SESSION_COOKIE, setSessionCookie } from '#lib/server/auth.js';
import { convexHttp, orFallback } from '#lib/convex.js';

export const load: PageServerLoad = async ({ cookies, url }) => {
	const session = await getAdminSession(cookies, url);
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

		let result;
		try {
			result = await convexHttp().mutation(api.settings.login, { pin });
		} catch (err) {
			console.error('admin login', err);
			return { success: false, error: '로그인하지 못했어요. 잠시 후 다시 시도해 주세요.' };
		}
		if (!result.ok) return { success: false, error: '잘못된 PIN입니다' };
		setSessionCookie(cookies, url, result.token);
		return { success: true };
	},

	logout: async ({ cookies, url }) => {
		const token = cookies.get(SESSION_COOKIE);
		if (token) {
			// Best effort: the session also expires on its own.
			await convexHttp()
				.mutation(api.settings.logout, { token })
				.catch((err) => console.error('admin logout', err));
		}
		clearSessionCookie(cookies, url);
		redirect(302, '/');
	}
};
