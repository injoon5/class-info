import type { PageServerLoad } from './$types.js';
import { api } from '@class-info/backend/convex/_generated/api';
import { getAdminSession } from '$lib/server/auth';
import { convexHttp } from '$lib/convex';
import { getNowInKst } from '$lib/date';

export const load = (async ({ cookies }) => {
	const kstNow = getNowInKst();
	const year = kstNow.getFullYear();
	const client = convexHttp();

	const [schoolEvents, customEvents] = await Promise.all([
		client.query(api.schedule.getSchoolEventsByYear, { year: String(year) }).catch((err) => {
			console.error('calendar getSchoolEventsByYear', err);
			return undefined;
		}),
		client.query(api.schedule.getCustomEventsByYear, { year: String(year) }).catch((err) => {
			console.error('calendar getCustomEventsByYear', err);
			return undefined;
		})
	]);

	const { isAuthenticated, sessionToken } = await getAdminSession(cookies);

	return { schoolEvents, customEvents, isAuthenticated, sessionToken, year };
}) satisfies PageServerLoad;
