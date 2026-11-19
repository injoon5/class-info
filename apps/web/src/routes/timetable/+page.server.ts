import type { PageServerLoad } from './$types.js';
import { api } from '@class-info/backend/convex/_generated/api';
import { addDays, mondayOf, schoolClock } from '@class-info/backend/convex/dates';
import { convexHttp, orFallback } from '#lib/convex.js';
import { getAdminSession } from '#lib/server/auth.js';

export const load = (async ({ cookies }) => {
	const client = convexHttp();
	const thisMonday = mondayOf(schoolClock().today);
	const [thisWeek, nextWeek, full, session] = await Promise.all([
		orFallback(client.query(api.timetable.getWeek, { weekStart: thisMonday }), null, 'timetable this week'),
		orFallback(client.query(api.timetable.getWeek, { weekStart: addDays(thisMonday, 7) }), null, 'timetable next week'),
		orFallback(client.query(api.timetable.getFull, {}), null, 'timetable full'),
		getAdminSession(cookies)
	]);
	return { weeks: [thisWeek, nextWeek] as const, full, thisMonday, ...session };
}) satisfies PageServerLoad;
