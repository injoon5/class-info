import adapter from '@sveltejs/adapter-vercel';
import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig, loadEnv } from 'vite';
import { FILES_BASE_URL } from '@class-info/backend/convex/config';

// `npx convex deploy --cmd` injects CONVEX_URL for this deployment (preview or
// prod). SvelteKit only inlines PUBLIC_* into the client, and Vercel often has
// a hardcoded PUBLIC_CONVEX_URL pointing at production — so preview builds
// would keep talking to prod and the preview Convex console would stay quiet.
if (process.env.CONVEX_URL) {
	process.env.PUBLIC_CONVEX_URL = process.env.CONVEX_URL;
}

type CspDirectives = NonNullable<NonNullable<Parameters<typeof sveltekit>[0]>['csp']>['directives'];
type CspSource = NonNullable<NonNullable<CspDirectives>['connect-src']>[number];

// A local Convex backend (`npx convex dev` on a local deployment) serves from
// localhost, which the cloud-only connect-src below would block.
function convexOrigins(): CspSource[] {
	const raw = process.env.PUBLIC_CONVEX_URL ?? loadEnv('', process.cwd(), '').PUBLIC_CONVEX_URL;
	try {
		const url = new URL(raw ?? '');
		if (url.hostname.endsWith('.convex.cloud')) return [];
		const ws = url.protocol === 'https:' ? 'wss:' : 'ws:';
		return [url.origin, `${ws}//${url.host}`] as CspSource[];
	} catch {
		return [];
	}
}

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit({
			adapter: adapter(),
			csp: {
				mode: 'auto',
				directives: {
					'default-src': ['self'],
					'base-uri': ['self'],
					'form-action': ['self'],
					'frame-ancestors': ['none'],
					'object-src': ['none'],
					'script-src': ['self'],
					// Transitions inject a <style> element; SvelteKit requires unsafe-inline here.
					'style-src': ['self', 'unsafe-inline'],
					'img-src': ['self', 'https:', 'data:'],
					'font-src': ['self'],
					'connect-src': [
						'self',
						'https://*.convex.cloud',
						'wss://*.convex.cloud',
						'https://*.convex.site',
						'https://collector.onedollarstats.com',
						new URL(FILES_BASE_URL).origin as CspSource,
						'https://*.r2.cloudflarestorage.com',
						...convexOrigins()
					],
					'frame-src': ['https://www.youtube.com', 'https://www.youtube-nocookie.com'],
					'media-src': ['self', 'https:']
				}
			}
		})
	]
});
