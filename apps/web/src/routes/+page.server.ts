import { ConvexHttpClient } from 'convex/browser';
import type { PageServerLoad } from './$types.js';
import { PUBLIC_CONVEX_URL } from '$env/static/public';
import { api } from "@class-info/backend/convex/_generated/api";
import { getNowInKst } from '$lib/date';

export const load = (async () => {
	const client = new ConvexHttpClient(PUBLIC_CONVEX_URL!);
	const kstNow = getNowInKst();
	const year = kstNow.getFullYear();
	// In December, upcoming events can spill into next January, so pull both years.
	const years = kstNow.getMonth() === 11 ? [year, year + 1] : [year];

	const [noticesOverview, timetable, nextWeekTimetable, meals, ...eventPairs] = await Promise.all([
		client.query(api.notices.overview, {}),
		client.query(api.timetable.getByWeek, { week: 0 }),
		client.query(api.timetable.getByWeek, { week: 1 }),
		client.query(api.meals.getTwoWeeks, {}),
		...years.flatMap((y) => [
			client.query(api.schedule.getSchoolEventsByYear, { year: String(y) }).catch(() => []),
			client.query(api.schedule.getCustomEventsByYear, { year: String(y) }).catch(() => [])
		])
	]);

	const schoolEvents: any[] = [];
	const customEvents: any[] = [];
	for (let i = 0; i < eventPairs.length; i += 2) {
		schoolEvents.push(...(eventPairs[i] ?? []));
		customEvents.push(...(eventPairs[i + 1] ?? []));
	}

	return { noticesOverview, timetable, nextWeekTimetable, meals, schoolEvents, customEvents };
}) satisfies PageServerLoad;
