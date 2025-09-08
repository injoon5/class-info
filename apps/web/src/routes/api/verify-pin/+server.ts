import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '@class-info/backend/convex/_generated/api';
import { PUBLIC_CONVEX_URL } from '$env/static/public';

const convex = new ConvexHttpClient(PUBLIC_CONVEX_URL);

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { pin } = await request.json();
		
		if (!pin) {
			return json({ valid: false }, { status: 400 });
		}

		const result = await convex.query(api.settings.verifyPin, { pin });
		
		return json({ valid: result });
	} catch (error) {
		console.error('PIN verification error:', error);
		return json({ valid: false }, { status: 500 });
	}
};