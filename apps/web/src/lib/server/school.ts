import { ConvexHttpClient } from 'convex/browser';
import { PUBLIC_CONVEX_URL } from '$env/static/public';
import { env } from '$env/dynamic/public';
import { api } from '@class-info/backend/convex/_generated/api';

/**
 * Extract the school subdomain from a Host header.
 *
 * Production: `1-3.timefor.school` → `1-3`. The apex (`timefor.school`) and
 * `www` resolve to `null` (the marketing / registration landing).
 * Dev: `<sub>.localhost[:port]` works in browsers; otherwise PUBLIC_DEV_SUBDOMAIN
 * provides a fallback so plain `localhost` can target a school.
 */
export function getSubdomain(host: string | null): string | null {
	if (!host) return null;
	const h = host.split(':')[0].toLowerCase();

	if (h === 'localhost' || h === '127.0.0.1') {
		return env.PUBLIC_DEV_SUBDOMAIN || null;
	}
	if (h.endsWith('.localhost')) {
		return h.slice(0, -'.localhost'.length) || null;
	}

	const parts = h.split('.');
	// apex domain like `timefor.school` has 2 labels — no subdomain.
	if (parts.length <= 2) return env.PUBLIC_DEV_SUBDOMAIN || null;
	const sub = parts[0];
	if (sub === 'www') return null;
	return sub;
}

export function getConvexClient(): ConvexHttpClient {
	return new ConvexHttpClient(PUBLIC_CONVEX_URL!);
}

export async function resolveSchool(host: string | null) {
	const subdomain = getSubdomain(host);
	if (!subdomain) return { subdomain: null, school: null };
	const client = getConvexClient();
	const school = await client.query((api as any).schools.getBySubdomain, { subdomain });
	return { subdomain, school };
}
