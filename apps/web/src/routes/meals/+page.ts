import type { PageLoad } from './$types.js';
import { api } from '@class-info/backend/convex/_generated/api';
import { convexHttp, orFallback } from '$lib/convex';
import {
	addDaysYyyymmdd,
	getNowInKst,
	isAtOrAfterDinnerEnd,
	schoolDisplayClock,
	thisMondayYyyymmdd
} from '$lib/date';

export const load = (async ({ fetch }) => {
	const now = getNowInKst();
	const weekStart = thisMondayYyyymmdd(now);
	const displayClock = schoolDisplayClock(now);
	const client = convexHttp(fetch);

	const [twoWeeks, displayDay] = await Promise.all([
		orFallback(client.query(api.meals.getTwoWeeks, { weekStart }), undefined, 'meals'),
		orFallback(
			client.query(api.schedule.schoolDisplayDay, displayClock),
			displayClock.afterRollover ? addDaysYyyymmdd(displayClock.today, 1) : displayClock.today,
			'meals display day'
		)
	]);

	return {
		weekStart,
		twoWeeks,
		displayDay,
		todayYmd: displayClock.today,
		afterDinner: isAtOrAfterDinnerEnd(now)
	};
}) satisfies PageLoad;
