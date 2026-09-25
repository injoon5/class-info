import adapter from '@sveltejs/adapter-auto';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { loadEnv } from 'vite';

// A local Convex backend (`npx convex dev` on a local deployment) serves from
// localhost, which the cloud-only connect-src below would block.
function convexOrigins() {
	const raw = process.env.PUBLIC_CONVEX_URL ?? loadEnv('', process.cwd(), '').PUBLIC_CONVEX_URL;
	try {
		const url = new URL(raw ?? '');
		if (url.hostname.endsWith('.convex.cloud')) return [];
		const ws = url.protocol === 'https:' ? 'wss:' : 'ws:';
		return [url.origin, `${ws}//${url.host}`];
	} catch {
		return [];
	}
}

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),

	kit: {
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
					// Keep in sync with FILES_BASE_URL in packages/backend/convex/config.ts —
					// this file can't import that TS module, so it's a manual mirror.
					'https://files.timefor.school',
					'https://*.r2.cloudflarestorage.com',
					...convexOrigins()
				],
				'frame-src': ['https://www.youtube.com', 'https://www.youtube-nocookie.com'],
				'media-src': ['self', 'https:']
			}
		}
	}
};

export default config;
