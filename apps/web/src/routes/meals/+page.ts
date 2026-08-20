import type { PageLoad } from './$types.js';
import { api } from '@class-info/backend/convex/_generated/api';
import { convexHttp } from '$lib/convex';
import { addDaysYyyymmdd, getNowInKst, schoolDisplayClock, thisMondayYyyymmdd } from '$lib/date';

export const load = (async () => {
	const now = getNowInKst();
	const weekStart = thisMondayYyyymmdd(now);
	const displayClock = schoolDisplayClock(now);
	const client = convexHttp();

	const [twoWeeks, displayDay] = await Promise.all([
		client.query(api.meals.getTwoWeeks, { weekStart }).catch((err) => {
			console.error('meals.getTwoWeeks', err);
			return undefined;
		}),
		client.query(api.schedule.schoolDisplayDay, displayClock).catch((err) => {
			console.error('meals schedule.schoolDisplayDay', err);
			return displayClock.afterRollover
				? addDaysYyyymmdd(displayClock.today, 1)
				: displayClock.today;
		})
	]);

	return { weekStart, twoWeeks, displayDay, todayYmd: displayClock.today };
}) satisfies PageLoad;
