import type { PageLoad } from './$types.js';
import { api } from '@class-info/backend/convex/_generated/api';
import { convexHttp } from '$lib/convex';
import { thisMondayYyyymmdd } from '$lib/date';

export const load = (async () => {
	const weekStart = thisMondayYyyymmdd();
	const twoWeeks = await convexHttp()
		.query(api.meals.getTwoWeeks, { weekStart })
		.catch((err) => {
			console.error('meals.getTwoWeeks', err);
			return {
				thisWeek: { startdate: weekStart, enddate: weekStart, days: [] },
				nextWeek: { startdate: weekStart, enddate: weekStart, days: [] },
				availableMealTypes: [] as string[]
			};
		});
	return { weekStart, twoWeeks };
}) satisfies PageLoad;
