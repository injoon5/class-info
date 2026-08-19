import type { PageLoad } from './$types.js';
import { api } from '@class-info/backend/convex/_generated/api';
import { convexHttp } from '$lib/convex';
import { renderMarkdown } from '$lib/markdown';

export const load = (async ({ params }) => {
	try {
		const detail = await convexHttp().query(api.notices.detail, { id: params.id });
		const prerenderedHtml = detail.notice?.description
			? renderMarkdown(detail.notice.description)
			: null;
		return { ...detail, prerenderedHtml };
	} catch (err) {
		console.error('notices.detail', err);
		return { notice: null, files: [], prerenderedHtml: null };
	}
}) satisfies PageLoad;
