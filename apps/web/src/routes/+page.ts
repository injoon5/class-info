import type { PageLoad } from './$types.js';
import { api } from '@class-info/backend/convex/_generated/api';
import { convexHttp } from '$lib/convex';
import { addDaysYyyymmdd, getNowInKst, noticeClock, thisMondayYyyymmdd, yyyymmdd } from '$lib/date';

export const load = (async () => {
	const now = getNowInKst();
	const clock = noticeClock(now);
	const weekStart = thisMondayYyyymmdd(now);
	const todayYmd = yyyymmdd(now);
	const rangeEnd = addDaysYyyymmdd(todayYmd, 14);
	const client = convexHttp();

	const [currentGroups, timetable, nextWeekTimetable, meals, events] = await Promise.all([
		client.query(api.notices.currentGroups, clock),
		client.query(api.timetable.getByWeek, { week: 0 }),
		client.query(api.timetable.getByWeek, { week: 1 }),
		client.query(api.meals.getTwoWeeks, { weekStart }),
		client.query(api.schedule.getEventsInRange, { start: todayYmd, end: rangeEnd })
	]);

	return { ...clock, weekStart, currentGroups, timetable, nextWeekTimetable, meals, events };
}) satisfies PageLoad;
