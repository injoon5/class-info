import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types.js';
import { getConvexClient } from '$lib/server/school';
import { api } from "@class-info/backend/convex/_generated/api";

function getNowInKst(): Date {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60_000;
  return new Date(utc + 9 * 60 * 60_000);
}

export const load = (async ({ cookies, fetch, parent }) => {
  const { school } = await parent();
  if (!school) throw error(404, '학교를 찾을 수 없습니다.');
  const schoolId = school._id;

  const kstNow = getNowInKst();
  const year = kstNow.getFullYear();

  const client = getConvexClient();

  let schoolEvents: any[] = [];
  let customEvents: any[] = [];
  try {
    [schoolEvents, customEvents] = await Promise.all([
      client.query((api as any).schedule.getSchoolEventsByYear, { schoolId, year: String(year) }),
      client.query((api as any).schedule.getCustomEventsByYear, { schoolId, year: String(year) }),
    ]);
  } catch {}

  // School calendar custom events can be managed by any class admin of the
  // school. Treat the visitor as authenticated if they hold a valid admin
  // cookie for any class in this school.
  let isAuthenticated = false;
  try {
    const classes = await client.query((api as any).classes.listBySchool, { schoolId });
    for (const c of classes) {
      const pin = cookies.get(`admin_pin_${c._id}`);
      if (!pin) continue;
      const response = await fetch('/api/verify-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ classId: c._id, pin })
      });
      if (response.ok && (await response.json()).valid) {
        isAuthenticated = true;
        break;
      }
    }
  } catch {}

  return { schoolEvents, customEvents, isAuthenticated, year, schoolId };
}) satisfies PageServerLoad;
