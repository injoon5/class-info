import type { PageServerLoad } from './$types.js';
import { getConvexClient } from '$lib/server/school';
import { api } from "@class-info/backend/convex/_generated/api";

function getNowInKst(): Date {
	const now = new Date();
	const utc = now.getTime() + now.getTimezoneOffset() * 60_000;
	return new Date(utc + 9 * 60 * 60_000);
}

export const load = (async ({ parent }) => {
	const { klass, school } = await parent();
	const classId = klass._id;
	const schoolId = school._id;

	const client = getConvexClient();
	const kstNow = getNowInKst();
	const year = kstNow.getFullYear();

	const [noticesOverview, timetable, nextWeekTimetable, meals] = await Promise.all([
		client.query((api as any).notices.overview, { classId }),
		client.query((api as any).timetable.getByWeek, { classId, week: 0 }),
		client.query((api as any).timetable.getByWeek, { classId, week: 1 }),
		client.query((api as any).meals.getTwoWeeks, { schoolId }),
	]);

	let schoolEvents: any[] = [];
	let customEvents: any[] = [];
	try {
		[schoolEvents, customEvents] = await Promise.all([
			client.query((api as any).schedule.getSchoolEventsByYear, { schoolId, year: String(year) }),
			client.query((api as any).schedule.getCustomEventsByYear, { schoolId, year: String(year) }),
		]);
	} catch {}

	return { noticesOverview, timetable, nextWeekTimetable, meals, schoolEvents, customEvents };
}) satisfies PageServerLoad;
