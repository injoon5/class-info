import type { LayoutServerLoad } from './$types';
import { resolveSchool } from '$lib/server/school';

export const load = (async ({ request, url }) => {
	const host = request.headers.get('host') ?? url.host;
	const { subdomain, school } = await resolveSchool(host);
	return { subdomain, school };
}) satisfies LayoutServerLoad;
