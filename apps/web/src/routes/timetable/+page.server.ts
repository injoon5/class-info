import type { PageServerLoad } from './$types.js';
import { api } from '@class-info/backend/convex/_generated/api';
import { convexHttp } from '$lib/convex';
import { getAdminSession } from '$lib/server/auth';

export const load = (async ({ cookies }) => {
	const client = convexHttp();
	const [timetable, nextWeek, full, session] = await Promise.all([
		client.query(api.timetable.getByWeek, { week: 0 }).catch((err) => {
			console.error('timetable week 0', err);
			return null;
		}),
		client.query(api.timetable.getByWeek, { week: 1 }).catch((err) => {
			console.error('timetable week 1', err);
			return null;
		}),
		client.query(api.timetable.getFull, {}).catch((err) => {
			console.error('timetable getFull', err);
			return null;
		}),
		getAdminSession(cookies)
	]);
	return { timetable, nextWeek, full, ...session };
}) satisfies PageServerLoad;
