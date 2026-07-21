import type { PageServerLoad, Actions } from './$types';
import { redirect } from '@sveltejs/kit';
import { ConvexHttpClient } from 'convex/browser';
import { PUBLIC_CONVEX_URL } from '$env/static/public';
import { api } from '@class-info/backend/convex/_generated/api';
import { getAdminSession, SESSION_COOKIE, SESSION_MAX_AGE } from '$lib/server/auth';

export const load: PageServerLoad = async ({ cookies }) => {
	const { isAuthenticated, sessionToken } = await getAdminSession(cookies);
	return { isAuthenticated, sessionToken };
};

export const actions: Actions = {
	login: async ({ request, cookies }) => {
		const data = await request.formData();
		const pin = data.get('pin') as string;

		try {
			const client = new ConvexHttpClient(PUBLIC_CONVEX_URL!);
			const result = await client.mutation(api.settings.login, { pin });
			if (result.ok) {
				cookies.set(SESSION_COOKIE, result.token, {
					path: '/',
					maxAge: SESSION_MAX_AGE,
					sameSite: 'strict',
					secure: process.env.NODE_ENV === 'production',
					httpOnly: true
				});
				return { success: true };
			}
		} catch {
			// fall through to the generic error
		}

		return { success: false, error: '잘못된 PIN입니다' };
	},

	logout: async ({ cookies }) => {
		const token = cookies.get(SESSION_COOKIE);
		if (token) {
			try {
				const client = new ConvexHttpClient(PUBLIC_CONVEX_URL!);
				await client.mutation(api.settings.logout, { token });
			} catch {
				// best-effort server-side revocation
			}
		}
		cookies.delete(SESSION_COOKIE, { path: '/' });
		throw redirect(302, '/');
	}
};
