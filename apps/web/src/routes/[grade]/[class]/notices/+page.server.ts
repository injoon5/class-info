import type { PageServerLoad } from './$types.js';
import { getConvexClient } from '$lib/server/school';
import { api } from "@class-info/backend/convex/_generated/api";

export const load = (async ({ parent }) => {
	const { klass } = await parent();
	const client = getConvexClient();
	return await client.query((api as any).notices.overview, { classId: klass._id });
}) satisfies PageServerLoad;
