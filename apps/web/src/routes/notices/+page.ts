import type { PageLoad } from './$types.js';
import { api } from '@class-info/backend/convex/_generated/api';
import { convexHttp } from '$lib/convex';
import { noticeClock } from '$lib/date';

export const load = (async () => {
	const clock = noticeClock();
	try {
		const overview = await convexHttp().query(api.notices.overview, clock);
		return { ...clock, ...overview };
	} catch (err) {
		console.error('notices.overview', err);
		return { ...clock, currentGroups: [], pastMonths: [] };
	}
}) satisfies PageLoad;
