import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types.js';
import { getConvexClient } from '$lib/server/school';
import { api } from "@class-info/backend/convex/_generated/api";

export const load = (async ({ parent }) => {
  const { school } = await parent();
  if (!school) throw error(404, '학교를 찾을 수 없습니다.');
  const client = getConvexClient();
  const data = await client.query((api as any).meals.getTwoWeeks, { schoolId: school._id });
  return { twoWeeks: data };
}) satisfies PageServerLoad;
