import type { PageServerLoad, Actions } from './$types';
import { redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ cookies, fetch, parent }) => {
	const { klass } = await parent();
	const classId = klass._id;
	const cookieName = `admin_pin_${classId}`;
	const adminPin = cookies.get(cookieName);

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
			body: JSON.stringify({ classId, pin: adminPin })
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

	// Invalid PIN, clear cookie
	cookies.delete(cookieName, { path: '/' });
	return { isAuthenticated: false };
};

export const actions: Actions = {
	login: async ({ request, cookies, fetch, params }) => {
		const data = await request.formData();
		const pin = data.get('pin') as string;
		const classId = data.get('classId') as string;
		const cookieName = `admin_pin_${classId}`;

		// Validate PIN with Convex
		try {
			const response = await fetch(`/api/verify-pin`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ classId, pin })
			});

			if (response.ok) {
				const result = await response.json();
				if (result.valid) {
					// Store the PIN in a class-scoped secure cookie for 24 hours
					cookies.set(cookieName, pin, {
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

	logout: async ({ cookies, request }) => {
		const data = await request.formData();
		const classId = data.get('classId') as string;
		if (classId) cookies.delete(`admin_pin_${classId}`, { path: '/' });
		throw redirect(302, `/`);
	}
};
