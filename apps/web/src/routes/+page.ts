import type { PageLoad } from './$types.js';
import { api } from '@class-info/backend/convex/_generated/api';
import { convexHttp } from '$lib/convex';
import { addDaysYyyymmdd, getNowInKst, noticeClock, thisMondayYyyymmdd, yyyymmdd } from '$lib/date';

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
	const weekStart = thisMondayYyyymmdd(now);
	const todayYmd = yyyymmdd(now);
	const rangeEnd = addDaysYyyymmdd(todayYmd, 14);
	const client = convexHttp();

	const [currentGroups, timetable, nextWeekTimetable, meals, events] = await Promise.all([
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
		}),
		client.query(api.schedule.getEventsInRange, { start: todayYmd, end: rangeEnd }).catch((err) => {
			console.error('home schedule.getEventsInRange', err);
			return [];
		})
	]);

	return { ...clock, weekStart, currentGroups, timetable, nextWeekTimetable, meals, events };
}) satisfies PageLoad;
