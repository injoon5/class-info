import type { PageServerLoad } from './$types.js';
import { getConvexClient } from '$lib/server/school';
import { api } from "@class-info/backend/convex/_generated/api";

export const load = (async ({ parent }) => {
	const { school } = await parent();
	if (!school) return { classes: [] };

	const client = getConvexClient();
	const classes = await client.query((api as any).classes.listBySchool, { schoolId: school._id });
	// Sort by grade then class number for a stable directory.
	classes.sort((a: any, b: any) => a.grade - b.grade || a.classNo - b.classNo);
	return { classes };
}) satisfies PageServerLoad;
