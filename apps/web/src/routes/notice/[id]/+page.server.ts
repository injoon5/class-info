import { ConvexHttpClient } from 'convex/browser';
import type { PageServerLoad } from './$types.js';
import { PUBLIC_CONVEX_URL } from '$env/static/public';
import { api } from "@class-info/backend/convex/_generated/api";

export const load = (async ({ params }) => {
	const client = new ConvexHttpClient(PUBLIC_CONVEX_URL!);
	const { id } = params;
	
	const [notice, files] = await Promise.all([
		client.query(api.notices.getById, { id: id as any }),
		client.query(api.files.getNoticeFiles, { noticeId: id as any })
	]);
	
	return {
		notice,
		files
	};
}) satisfies PageServerLoad;