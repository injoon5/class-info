import type { PageLoad } from './$types.js';
import { api } from '@class-info/backend/convex/_generated/api';
import { schoolClock } from '@class-info/backend/convex/dates';
import { convexHttp, orFallback } from '#lib/convex.js';

export const load = (async ({ fetch }) => {
	const clock = schoolClock();
	const overview = await orFallback(
		convexHttp(fetch).query(api.notices.overview, clock),
		{ currentGroups: [], pastMonths: [] },
		'notices overview'
	);
	return { clock, ...overview };
}) satisfies PageLoad;
