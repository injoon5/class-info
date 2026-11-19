import type { PageLoad } from './$types.js';
import { api } from '@class-info/backend/convex/_generated/api';
import { convexHttp, orFallback } from '#lib/convex.js';

export const load = (async ({ params, fetch }) => {
	return await orFallback(
		convexHttp(fetch).query(api.notices.detail, { id: params.id }),
		{ notice: null, files: [] },
		'notice detail'
	);
}) satisfies PageLoad;
