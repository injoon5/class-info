import type { PageServerLoad } from './$types.js';
import { api } from '@class-info/backend/convex/_generated/api';
import { convexHttp, orFallback } from '$lib/convex';
import { getAdminSession } from '$lib/server/auth';
import { thisMondayYyyymmdd } from '$lib/date';

export const load = (async ({ cookies }) => {
	const client = convexHttp();
	const [timetable, nextWeek, full, session] = await Promise.all([
		orFallback(client.query(api.timetable.getByWeek, { week: 0 }), null, 'timetable 0'),
		orFallback(client.query(api.timetable.getByWeek, { week: 1 }), null, 'timetable 1'),
		orFallback(client.query(api.timetable.getFull, {}), null, 'timetable full'),
		getAdminSession(cookies)
	]);
	return { timetable, nextWeek, full, thisMonday: thisMondayYyyymmdd(), ...session };
}) satisfies PageServerLoad;
