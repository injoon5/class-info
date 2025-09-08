import type { PageServerLoad, Actions } from './$types';
import { redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ cookies }) => {
	const isAuthenticated = cookies.get('admin_authenticated') === 'true';
	
	return {
		isAuthenticated
	};
};

export const actions: Actions = {
	login: async ({ request, cookies, fetch }) => {
		const data = await request.formData();
		const pin = data.get('pin') as string;

		// Get the admin PIN from Convex
		try {
			const response = await fetch(`/api/verify-pin`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ pin })
			});

			if (response.ok) {
				const result = await response.json();
				if (result.valid) {
					// Set authentication cookie for 24 hours
					cookies.set('admin_authenticated', 'true', {
						path: '/',
						maxAge: 60 * 60 * 24, // 24 hours
						sameSite: 'strict',
						secure: false // Set to true in production with HTTPS
					});
					
					return { success: true };
				}
			}
		} catch (error) {
			console.error('PIN verification failed:', error);
		}

		return { success: false, error: '잘못된 PIN입니다' };
	},

	logout: async ({ cookies }) => {
		cookies.delete('admin_authenticated', { path: '/' });
		throw redirect(302, '/');
	}
};