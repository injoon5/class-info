import { ConvexHttpClient } from 'convex/browser';
import type { PageServerLoad } from './$types.js';
import { PUBLIC_CONVEX_URL } from '$env/static/public';
import { api } from "@class-info/backend/convex/_generated/api";
import { renderMarkdown } from '$lib/markdown';

export const load = (async ({ params }) => {
	const client = new ConvexHttpClient(PUBLIC_CONVEX_URL!);
	const { id } = params;

	const detail = await client.query(api.notices.detail, { id: id as any });

	const prerenderedHtml = detail.notice?.description
		? renderMarkdown(detail.notice.description)
		: null;

	return { ...detail, prerenderedHtml };
}) satisfies PageServerLoad;