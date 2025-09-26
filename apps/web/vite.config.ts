import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()], 
	server: {
		allowedHosts: ['localhost', '94a695e41cff.ngrok-free.app', '192.168.219.138']
	}
});
