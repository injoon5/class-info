import { defineEnvVars } from '@sveltejs/kit/env';

export const variables = defineEnvVars({
	PUBLIC_CONVEX_URL: {
		public: true,
		static: true,
		description: 'Convex deployment URL. `npx convex deploy --cmd` injects it on Vercel.',
		schema: (value) => {
			if (!value) throw new Error('Missing PUBLIC_CONVEX_URL — copy apps/web/.env.example to .env');
			new URL(value); // throws on a malformed URL
			return value;
		}
	}
});
