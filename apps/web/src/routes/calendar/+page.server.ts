import type { PageServerLoad } from './$types.js';
import { api } from '@class-info/backend/convex/_generated/api';
import { getAdminSession } from '$lib/server/auth';
import { convexHttp } from '$lib/convex';
import { getNowInKst } from '$lib/date';

export const load = (async ({ cookies }) => {
	const kstNow = getNowInKst();
	const year = kstNow.getFullYear();
	const start = `${year}0101`;
	const end = `${year}1231`;

	const events = await convexHttp()
		.query(api.schedule.getEventsInRange, { start, end })
		.catch((err) => {
			console.error('calendar getEventsInRange', err);
			return undefined;
		});

	const { isAuthenticated, sessionToken } = await getAdminSession(cookies);

	return { events, isAuthenticated, sessionToken, year };
}) satisfies PageServerLoad;
