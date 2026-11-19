import type { PageLoad } from './$types.js';
import { api } from '@class-info/backend/convex/_generated/api';
import { isAfterDinner, mondayOf, resolveDisplayDay, schoolClock } from '@class-info/backend/convex/dates';
import { convexHttp, orFallback } from '#lib/convex.js';

export const load = (async ({ fetch }) => {
	const now = Date.now();
	const clock = schoolClock(now);
	const weekStart = mondayOf(clock.today);
	const client = convexHttp(fetch);

	const [twoWeeks, displayDay] = await Promise.all([
		orFallback(client.query(api.meals.getTwoWeeks, { weekStart }), undefined, 'meals'),
		orFallback(
			client.query(api.schedule.schoolDisplayDay, clock),
			resolveDisplayDay(clock, new Set()),
			'meals display day'
		)
	]);

	return { weekStart, twoWeeks, displayDay, todayYmd: clock.today, afterDinner: isAfterDinner(now) };
}) satisfies PageLoad;
