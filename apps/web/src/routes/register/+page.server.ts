import type { PageServerLoad } from './$types.js';
import { getConvexClient } from '$lib/server/school';
import { api } from "@class-info/backend/convex/_generated/api";

export const load = (async () => {
	const client = getConvexClient();
	let enabled = true;
	try {
		enabled = await client.query((api as any).settings.isRegistrationEnabled, {});
	} catch {}
	return { registrationEnabled: enabled };
}) satisfies PageServerLoad;
