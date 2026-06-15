import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()], 
	server: {
		// `.localhost` allows any <subdomain>.localhost during development so
		// each school's subdomain resolves locally.
		allowedHosts: ['localhost', '.localhost', '7942e0e5d40c.ngrok-free.app', '192.168.219.138']
	}
});
