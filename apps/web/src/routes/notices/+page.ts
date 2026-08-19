import type { PageLoad } from './$types.js';
import { api } from '@class-info/backend/convex/_generated/api';
import { convexHttp } from '$lib/convex';
import { noticeClock } from '$lib/date';

export const load = (async () => {
	const clock = noticeClock();
	const overview = await convexHttp().query(api.notices.overview, clock);
	return { ...clock, ...overview };
}) satisfies PageLoad;
