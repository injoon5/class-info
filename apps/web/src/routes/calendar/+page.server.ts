import type { PageServerLoad } from './$types.js';
import { api } from '@class-info/backend/convex/_generated/api';
import { getAdminSession } from '#lib/server/auth.js';
import { convexHttp, orFallback } from '#lib/convex.js';
import { getNowInKst, yyyymmdd } from '#lib/date.js';

export const load = (async ({ cookies }) => {
	const now = getNowInKst();
	const year = now.getFullYear();
	const [events, session] = await Promise.all([
		orFallback(
			convexHttp().query(api.schedule.getEventsInRange, { start: `${year}0101`, end: `${year}1231` }),
			undefined,
			'calendar events'
		),
		getAdminSession(cookies)
	]);
	return { events, year, todayYmd: yyyymmdd(now), ...session };
}) satisfies PageServerLoad;
