import type { PageLoad } from './$types.js';
import { api } from '@class-info/backend/convex/_generated/api';
import { convexHttp, orFallback } from '$lib/convex';
import { renderMarkdown } from '$lib/markdown';

export const load = (async ({ params, fetch }) => {
	const detail = await orFallback(
		convexHttp(fetch).query(api.notices.detail, { id: params.id }),
		{ notice: null, files: [] },
		'notice detail'
	);
	return {
		...detail,
		prerenderedHtml: detail.notice?.description ? renderMarkdown(detail.notice.description) : null
	};
}) satisfies PageLoad;
