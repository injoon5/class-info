import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '@class-info/backend/convex/_generated/api';
import { PUBLIC_CONVEX_URL } from '$env/static/public';

const convex = new ConvexHttpClient(PUBLIC_CONVEX_URL);

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { pin, classId } = await request.json();

		if (!pin || !classId) {
			return json({ valid: false }, { status: 400 });
		}

		const result = await convex.query((api as any).settings.verifyPin, { classId, pin });

		return json({ valid: result });
	} catch (error) {
		console.error('PIN verification error:', error);
		return json({ valid: false }, { status: 500 });
	}
};