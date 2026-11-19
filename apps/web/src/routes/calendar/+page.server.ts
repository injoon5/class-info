import type { PageServerLoad } from './$types.js';
import { api } from '@class-info/backend/convex/_generated/api';
import { schoolClock } from '@class-info/backend/convex/dates';
import { convexHttp, orFallback } from '#lib/convex.js';
import { getAdminSession } from '#lib/server/auth.js';

export const load = (async ({ cookies, url }) => {
	const { today } = schoolClock();
	const year = today.slice(0, 4);
	const [events, session] = await Promise.all([
		orFallback(
			convexHttp().query(api.schedule.getEventsInRange, { start: `${year}0101`, end: `${year}1231` }),
			undefined,
			'calendar events'
		),
		getAdminSession(cookies, url)
	]);
	return { events, todayYmd: today, ...session };
}) satisfies PageServerLoad;
