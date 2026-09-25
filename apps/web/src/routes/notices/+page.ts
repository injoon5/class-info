import type { PageLoad } from './$types.js';
import { api } from '@class-info/backend/convex/_generated/api';
import { convexHttp, orFallback } from '$lib/convex';
import { noticeClock } from '$lib/date';

export const load = (async ({ fetch }) => {
	const clock = noticeClock();
	const overview = await orFallback(
		convexHttp(fetch).query(api.notices.overview, clock),
		{ currentGroups: [], pastMonths: [] },
		'notices overview'
	);
	return { ...clock, ...overview };
}) satisfies PageLoad;
