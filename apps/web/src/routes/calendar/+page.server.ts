import { ConvexHttpClient } from 'convex/browser';
import type { PageServerLoad } from './$types.js';
import { PUBLIC_CONVEX_URL } from '$env/static/public';
import { api } from "@class-info/backend/convex/_generated/api";

function getNowInKst(): Date {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60_000;
  return new Date(utc + 9 * 60 * 60_000);
}

export const load = (async ({ cookies, fetch }) => {
  const kstNow = getNowInKst();
  const year = kstNow.getFullYear();

  const client = new ConvexHttpClient(PUBLIC_CONVEX_URL!);

  let schoolEvents: any[] = [];
  let customEvents: any[] = [];
  try {
    [schoolEvents, customEvents] = await Promise.all([
      client.query((api as any).schedule.getSchoolEventsByYear, { year: String(year) }),
      client.query((api as any).schedule.getCustomEventsByYear, { year: String(year) }),
    ]);
  } catch {}

  const adminPin = cookies.get('admin_pin');
  let isAuthenticated = false;
  if (adminPin) {
    try {
      const response = await fetch('/api/verify-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: adminPin })
      });
      if (response.ok) {
        const result = await response.json();
        isAuthenticated = result.valid;
      }
    } catch {}
  }

  return { schoolEvents, customEvents, isAuthenticated, year };
}) satisfies PageServerLoad;
