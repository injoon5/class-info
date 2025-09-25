import { ConvexHttpClient } from 'convex/browser';
import type { PageServerLoad } from './$types.js';
import { PUBLIC_CONVEX_URL } from '$env/static/public';
import { api } from "@class-info/backend/convex/_generated/api";

export const load = (async () => {
	const client = new ConvexHttpClient(PUBLIC_CONVEX_URL!);
	return {
		timetable: await client.query(api.timetable.getByWeek, { week: 0 })
	};
}) satisfies PageServerLoad;


