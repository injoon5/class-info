import type { RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = ({ url }) => {
	const origin = url.origin;
	const body = [
		'User-agent: *',
		'Allow: /',
		'Disallow: /admin',
		'Disallow: /admin/',
		'Disallow: /api/',
		'',
		`Sitemap: ${origin}/sitemap.xml`,
		'',
		'Content-Signal: ai-train=no, search=yes, ai-input=no',
	].join('\n');

	return new Response(body, {
		headers: {
			'Content-Type': 'text/plain; charset=utf-8',
			'Cache-Control': 'public, max-age=3600',
		},
	});
};
