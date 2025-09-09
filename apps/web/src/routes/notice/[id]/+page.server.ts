import { ConvexHttpClient } from 'convex/browser';
import type { PageServerLoad } from './$types.js';
import { PUBLIC_CONVEX_URL } from '$env/static/public';
import { api } from "@class-info/backend/convex/_generated/api";

export const load = (async ({ params }) => {
	const client = new ConvexHttpClient(PUBLIC_CONVEX_URL!);
	const { id } = params;
	
	return {
		notice: await client.query(api.notices.getById, { id })
	};
}) satisfies PageServerLoad;