import type { PageLoad } from './$types.js';
import { api } from '@class-info/backend/convex/_generated/api';
import { convexHttp } from '$lib/convex';

export const load = (async () => {
	const client = convexHttp();
	const [timetable, nextWeek] = await Promise.all([
		client.query(api.timetable.getByWeek, { week: 0 }).catch((err) => {
			console.error('timetable week 0', err);
			return null;
		}),
		client.query(api.timetable.getByWeek, { week: 1 }).catch((err) => {
			console.error('timetable week 1', err);
			return null;
		})
	]);
	return { timetable, nextWeek };
}) satisfies PageLoad;
