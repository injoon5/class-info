import type { Handle } from '@sveltejs/kit';

function htmlToMarkdown(html: string): string {
	return html
		.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
		.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
		.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, '# $1\n\n')
		.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, '## $1\n\n')
		.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, '### $1\n\n')
		.replace(/<h4[^>]*>([\s\S]*?)<\/h4>/gi, '#### $1\n\n')
		.replace(/<a[^>]+href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, '[$2]($1)')
		.replace(/<strong[^>]*>([\s\S]*?)<\/strong>/gi, '**$1**')
		.replace(/<b[^>]*>([\s\S]*?)<\/b>/gi, '**$1**')
		.replace(/<em[^>]*>([\s\S]*?)<\/em>/gi, '_$1_')
		.replace(/<i[^>]*>([\s\S]*?)<\/i>/gi, '_$1_')
		.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, '- $1\n')
		.replace(/<\/?[uo]l[^>]*>/gi, '\n')
		.replace(/<br\s*\/?>/gi, '\n')
		.replace(/<\/p>/gi, '\n\n')
		.replace(/<p[^>]*>/gi, '')
		.replace(/<\/div>/gi, '\n')
		.replace(/<[^>]+>/g, '')
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'")
		.replace(/&nbsp;/g, ' ')
		.replace(/&amp;/g, '&') // must be last so "&amp;lt;" -> "&lt;", not "<"
		.replace(/\n{3,}/g, '\n\n')
		.trim();
}

function applySecurityHeaders(response: Response): void {
	response.headers.set('X-Content-Type-Options', 'nosniff');
	response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
	response.headers.set('X-Frame-Options', 'DENY');
	response.headers.set(
		'Permissions-Policy',
		'camera=(), microphone=(), geolocation=(), payment=(), usb=()'
	);
}

export const handle: Handle = async ({ event, resolve }) => {
	const accept = event.request.headers.get('accept') ?? '';
	const wantsMarkdown = accept.includes('text/markdown');
	const isAdmin = event.url.pathname === '/admin' || event.url.pathname.startsWith('/admin/');

	if (wantsMarkdown && !isAdmin) {
		const response = await resolve(event);
		applySecurityHeaders(response);
		const contentType = response.headers.get('content-type') ?? '';
		if (contentType.includes('text/html')) {
			const html = await response.text();
			const markdown = htmlToMarkdown(html);
			return new Response(markdown, {
				status: response.status,
				headers: {
					'Content-Type': 'text/markdown; charset=utf-8',
					'Cache-Control': response.headers.get('cache-control') ?? 'no-cache',
					Vary: 'Accept',
					'X-Content-Type-Options': 'nosniff',
					'Referrer-Policy': 'strict-origin-when-cross-origin',
					'X-Frame-Options': 'DENY',
					'Permissions-Policy':
						'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
				},
			});
		}
		response.headers.append('Vary', 'Accept');
		return response;
	}

	const response = await resolve(event);
	applySecurityHeaders(response);

	if (event.url.pathname === '/') {
		const origin = event.url.origin;
		response.headers.append('Link', `<${origin}/sitemap.xml>; rel="sitemap"`);
		response.headers.append('Link', `<${origin}/robots.txt>; rel="robots-txt"`);
	}

	response.headers.append('Vary', 'Accept');

	return response;
};
