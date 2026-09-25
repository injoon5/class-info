import type { PageLoad } from './$types.js';
import { api } from '@class-info/backend/convex/_generated/api';
import { convexHttp, orFallback } from '$lib/convex';
import {
	addDaysYyyymmdd,
	getNowInKst,
	isAtOrAfterDinnerEnd,
	noticeClock,
	schoolDisplayClock,
	thisMondayYyyymmdd,
	yyyymmdd
} from '$lib/date';

export const load = (async ({ fetch }) => {
	const now = getNowInKst();
	const clock = noticeClock(now);
	const displayClock = schoolDisplayClock(now);
	const todayYmd = yyyymmdd(now);
	const client = convexHttp(fetch);

	const [schedule, currentGroups, timetable, nextWeekTimetable, meals] = await Promise.all([
		orFallback(
			client.query(api.schedule.homeSchedule, displayClock),
			{
				displayDay: displayClock.afterRollover ? addDaysYyyymmdd(todayYmd, 1) : todayYmd,
				events: [],
				ddays: []
			},
			'home schedule'
		),
		orFallback(client.query(api.notices.currentGroups, clock), [], 'home notices'),
		orFallback(client.query(api.timetable.getByWeek, { week: 0 }), null, 'home timetable 0'),
		orFallback(client.query(api.timetable.getByWeek, { week: 1 }), null, 'home timetable 1'),
		orFallback(client.query(api.meals.getTwoWeeks, { weekStart: thisMondayYyyymmdd(now) }), null, 'home meals')
	]);

	return {
		...clock,
		...schedule,
		todayYmd,
		afterDinner: isAtOrAfterDinnerEnd(now),
		currentGroups,
		timetable,
		nextWeekTimetable,
		meals
	};
}) satisfies PageLoad;
