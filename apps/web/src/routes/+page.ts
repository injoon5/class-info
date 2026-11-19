import type { PageLoad } from './$types.js';
import { api } from '@class-info/backend/convex/_generated/api';
import { addDays, isAfterDinner, mondayOf, resolveDisplayDay, schoolClock } from '@class-info/backend/convex/dates';
import { convexHttp, orFallback } from '#lib/convex.js';

export const load = (async ({ fetch }) => {
	const now = Date.now();
	const clock = schoolClock(now);
	const thisMonday = mondayOf(clock.today);
	const client = convexHttp(fetch);

	const [schedule, currentGroups, weeks, meals] = await Promise.all([
		orFallback(
			client.query(api.schedule.homeSchedule, clock),
			{ displayDay: resolveDisplayDay(clock, new Set()), events: [], ddays: [] },
			'home schedule'
		),
		orFallback(client.query(api.notices.currentGroups, clock), [], 'home notices'),
		// The display day is in this week or the next, unless a break pushes it further.
		Promise.all(
			[thisMonday, addDays(thisMonday, 7)].map((weekStart) =>
				orFallback(client.query(api.timetable.getWeek, { weekStart }), null, 'home timetable')
			)
		),
		orFallback(client.query(api.meals.getTwoWeeks, { weekStart: thisMonday }), null, 'home meals')
	]);

	return {
		clock,
		...schedule,
		afterDinner: isAfterDinner(now),
		currentGroups,
		timetable: weeks.find((week) => week?.weekStart === mondayOf(schedule.displayDay)) ?? null,
		meals
	};
}) satisfies PageLoad;
