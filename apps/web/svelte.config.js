import adapter from '@sveltejs/adapter-auto';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://svelte.dev/docs/kit/integrations
	// for more information about preprocessors
	preprocess: vitePreprocess(),

	kit: {
		// adapter-auto only supports some environments, see https://svelte.dev/docs/kit/adapter-auto for a list.
		// If your environment is not supported, or you settled on a specific environment, switch out the adapter.
		// See https://svelte.dev/docs/kit/adapters for more information about adapters.
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
					'https://files.timefor.school',
					'https://*.r2.cloudflarestorage.com'
				],
				'frame-src': ['https://www.youtube.com', 'https://www.youtube-nocookie.com'],
				'media-src': ['self', 'https:']
			}
		}
	}
};

export default config;
