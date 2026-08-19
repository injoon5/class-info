import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

// `npx convex deploy --cmd` injects CONVEX_URL for this deployment (preview or
// prod). SvelteKit only inlines PUBLIC_* into the client, and Vercel often has
// a hardcoded PUBLIC_CONVEX_URL pointing at production — so preview builds
// would keep talking to prod and the preview Convex console would stay quiet.
if (process.env.CONVEX_URL) {
	process.env.PUBLIC_CONVEX_URL = process.env.CONVEX_URL;
}

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()]
});
