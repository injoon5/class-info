import type { PageServerLoad, Actions } from './$types';
import { redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ cookies, fetch }) => {
	const adminPin = cookies.get('admin_pin');
	
	if (!adminPin) {
		return { isAuthenticated: false };
	}
	
	// Validate PIN on each request
	try {
		const response = await fetch(`/api/verify-pin`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({ pin: adminPin })
		});

		if (response.ok) {
			const result = await response.json();
			if (result.valid) {
				return { isAuthenticated: true };
			}
		}
	} catch (error) {
		// console.error('PIN validation failed:', error);
	}
	
	// Invalid PIN, clear cookie and redirect
	cookies.delete('admin_pin', { path: '/' });
	return { isAuthenticated: false };
};

export const actions: Actions = {
	login: async ({ request, cookies, fetch }) => {
		const data = await request.formData();
		const pin = data.get('pin') as string;

		// Validate PIN with Convex
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
					// Store the PIN in secure cookie for 24 hours
					cookies.set('admin_pin', pin, {
						path: '/',
						maxAge: 60 * 60 * 24, // 24 hours
						sameSite: 'strict',
						secure: process.env.NODE_ENV === 'production',
						httpOnly: true // Prevents XSS attacks
					});
					
					return { success: true };
				}
			}
		} catch (error) {
			// console.error('PIN verification failed:', error);
		}

		return { success: false, error: '잘못된 PIN입니다' };
	},

	logout: async ({ cookies }) => {
		cookies.delete('admin_pin', { path: '/' });
		throw redirect(302, '/');
	}
};