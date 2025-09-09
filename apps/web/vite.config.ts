import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()], 
	server: {
		allowedHosts: ['localhost', '49fc680f9119.ngrok-free.app']
	}
});
