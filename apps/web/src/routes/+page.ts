import type { PageLoad } from './$types.js';
import { api } from '@class-info/backend/convex/_generated/api';
import { convexHttp } from '$lib/convex';
import {
	addDaysYyyymmdd,
	getNowInKst,
	isAtOrAfterDinnerEnd,
	noticeClock,
	schoolDisplayClock,
	thisMondayYyyymmdd,
	yyyymmdd
} from '$lib/date';

function emptyMeals(weekStart: string) {
	return {
		thisWeek: { startdate: weekStart, enddate: addDaysYyyymmdd(weekStart, 4), days: [] },
		nextWeek: {
			startdate: addDaysYyyymmdd(weekStart, 7),
			enddate: addDaysYyyymmdd(weekStart, 11),
			days: []
		},
		availableMealTypes: [] as string[]
	};
}

export const load = (async () => {
	const now = getNowInKst();
	const clock = noticeClock(now);
	const displayClock = schoolDisplayClock(now);
	const weekStart = thisMondayYyyymmdd(now);
	const todayYmd = yyyymmdd(now);
	const client = convexHttp();

	// One query for both the display day and the events around it — they come
	// out of the same schedule scan on the server.
	const [schedule, currentGroups, timetable, nextWeekTimetable, meals] = await Promise.all([
		client.query(api.schedule.homeSchedule, displayClock).catch((err) => {
			console.error('home schedule.homeSchedule', err);
			return {
				displayDay: displayClock.afterRollover ? addDaysYyyymmdd(todayYmd, 1) : todayYmd,
				events: []
			};
		}),
		client.query(api.notices.currentGroups, clock).catch((err) => {
			console.error('home notices.currentGroups', err);
			return [];
		}),
		client.query(api.timetable.getByWeek, { week: 0 }).catch((err) => {
			console.error('home timetable week 0', err);
			return null;
		}),
		client.query(api.timetable.getByWeek, { week: 1 }).catch((err) => {
			console.error('home timetable week 1', err);
			return null;
		}),
		client.query(api.meals.getTwoWeeks, { weekStart }).catch((err) => {
			console.error('home meals.getTwoWeeks', err);
			return emptyMeals(weekStart);
		})
	]);

	return {
		...clock,
		todayYmd,
		afterDinner: isAtOrAfterDinnerEnd(now),
		displayDay: schedule.displayDay,
		weekStart,
		currentGroups,
		timetable,
		nextWeekTimetable,
		meals,
		events: schedule.events
	};
}) satisfies PageLoad;
