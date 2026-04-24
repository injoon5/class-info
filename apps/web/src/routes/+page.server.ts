import { ConvexHttpClient } from 'convex/browser';
import type { PageServerLoad } from './$types.js';
import { PUBLIC_CONVEX_URL } from '$env/static/public';
import { api } from "@class-info/backend/convex/_generated/api";

function getNowInKst(): Date {
	const now = new Date();
	const utc = now.getTime() + now.getTimezoneOffset() * 60_000;
	return new Date(utc + 9 * 60 * 60_000);
}

export const load = (async () => {
	const client = new ConvexHttpClient(PUBLIC_CONVEX_URL!);
	const kstNow = getNowInKst();
	const year = kstNow.getFullYear();

	const [noticesOverview, timetable, meals] = await Promise.all([
		client.query(api.notices.overview, {}),
		client.query(api.timetable.getByWeek, { week: 0 }),
		client.query((api as any).meals.getTwoWeeks, {}),
	]);

	let schoolEvents: any[] = [];
	let customEvents: any[] = [];
	try {
		[schoolEvents, customEvents] = await Promise.all([
			client.query((api as any).schedule.getSchoolEventsByYear, { year: String(year) }),
			client.query((api as any).schedule.getCustomEventsByYear, { year: String(year) }),
		]);
	} catch {}

	return { noticesOverview, timetable, meals, schoolEvents, customEvents };
}) satisfies PageServerLoad;
