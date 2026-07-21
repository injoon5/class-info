import type { RequestHandler } from '@sveltejs/kit';

// Only indexable routes belong here. /meals, /timetable and /calendar all set
// <meta name="robots" content="noindex">, so they are intentionally omitted.
const PUBLIC_ROUTES = [
	{ path: '/', changefreq: 'daily', priority: '1.0' },
	{ path: '/notices', changefreq: 'daily', priority: '0.9' },
];

export const GET: RequestHandler = ({ url }) => {
	const origin = url.origin;
	const today = new Date().toISOString().split('T')[0];

	const urls = PUBLIC_ROUTES.map(
		({ path, changefreq, priority }) => `
  <url>
    <loc>${origin}${path}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`
	).join('');

	const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}
</urlset>`;

	return new Response(body, {
		headers: {
			'Content-Type': 'application/xml; charset=utf-8',
			'Cache-Control': 'public, max-age=3600',
		},
	});
};
