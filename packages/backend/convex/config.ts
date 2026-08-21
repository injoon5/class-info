// Central place for the "arbitrary" values a fork changes to run this for its
// own class: which school it reads from, what hour the day flips over,
// branding, admin defaults, and so on. Everything here is a plain constant —
// edit this file and redeploy (`pnpm dev:server` / `npx convex deploy`), no
// schema or call-site changes required elsewhere.
//
// Imported by both the Convex backend and the SvelteKit frontend (as
// `@class-info/backend/convex/config`), so a value only needs to change once.
// See SETUP.md for the full walkthrough of forking this for a new class.

// ── School identity ─────────────────────────────────────────────────────
// Feeds https://timefor.school (a NEIS-backed API). Find your own school's
// code by searching for it at https://open.neis.go.kr, or by trying your
// school's name against https://api.timefor.school. `grade`/`classno` select
// which homeroom's timetable is fetched.
//
// Prefer the code over the name: school names repeat across regions, and the
// API resolves a duplicate to its first match rather than asking. 양정고등학교
// is both Seoul (7010208) and Busan (7150152).
export const SCHOOL = {
  code: "7010208",
  grade: 1,
  classno: 3,
} as const;

// Base URL of the timetable/meal/schedule API. Only change this if you're
// pointing at a different instance of the same API shape.
export const SCHOOL_API_BASE_URL = "https://api.timefor.school";

// ── Branding ─────────────────────────────────────────────────────────────
// Shown in the header, the PWA home-screen title, and page <title>/OpenGraph
// tags. The favicons, splash screens, and `apple-mobile-web-app-title` in
// apps/web/src/app.html are static assets/markup and need to be swapped by
// hand — see SETUP.md.
export const SITE_NAME = "TimeforSchool";

// Canonical production URL, used in absolute OpenGraph `og:url` tags. No
// trailing slash.
export const SITE_URL = "https://timefor.school";

// Class label shown in page titles and descriptions ("오늘 - 1학년 3반", "급식 -
// 1학년 3반", ...). Keep this in sync with SCHOOL.grade/classno above — it's
// separate only because the display format ("1학년 3반") isn't derivable from
// the numbers alone in every school's convention.
export const CLASS_LABEL = "1학년 3반";

// Public base URL admin-uploaded files (notice attachments) are served from.
// Point this at your own R2 bucket's public URL or a custom domain in front
// of it — see the R2 setup steps in SETUP.md. A fork that skips this keeps
// serving file links from the original deployment's domain.
export const FILES_BASE_URL = "https://files.timefor.school";

// ── Timezone ─────────────────────────────────────────────────────────────
// Hours east of UTC. Convex isolates always run in UTC; every "KST"-named
// helper in dates.ts shifts by this offset. Change it to run this for a
// class outside Korea — the KST naming is then cosmetic, not a hardcoded
// assumption.
export const TIMEZONE_OFFSET_HOURS = 9;

// ── Day boundaries ───────────────────────────────────────────────────────
// Home's timetable/meals and a notice's "past" status both flip to the next
// day at this local hour.
export const DAY_ROLLOVER_HOUR = 16;

// Today's dinner (석식) is still shown as "today's" until this local hour.
// Between the rollover and this hour, home already shows tomorrow, so
// tonight's dinner is listed first — it's served before tomorrow's lunch.
export const DINNER_END_HOUR = 19;

// ── Schedule / countdown windows ─────────────────────────────────────────
// How many days past the display day the home page's event list reaches.
export const HOME_EVENT_WINDOW_DAYS = 7;

// How many D-day countdowns the home hero shows before it stops being a hero.
export const HOME_DDAY_LIMIT = 2;

// Long enough to jump a summer break, in both directions: forward to find the
// next school day, backward to find the 방학 marker that started a break
// already under way.
export const SCHOOL_DAY_LOOKAHEAD = 90;

// Widest date range a single calendar query will serve.
export const SCHEDULE_RANGE_MAX_DAYS = 400;

// ── Admin auth ───────────────────────────────────────────────────────────
// Used only until an admin sets a real PIN via settings.setPin — change it
// on day one, don't just rely on this default.
export const DEFAULT_ADMIN_PIN = "1234";
export const ADMIN_SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// Login brute-force throttle: after this many failed attempts inside the
// window, lock out for this long.
export const LOGIN_MAX_FAILS = 5;
export const LOGIN_WINDOW_MS = 15 * 60 * 1000;
export const LOGIN_LOCKOUT_MS = 15 * 60 * 1000;

// ── Cron polling ─────────────────────────────────────────────────────────
// Convex cron args are UTC — the comment is these hours read in KST, purely
// informational. Recompute if you change TIMEZONE_OFFSET_HOURS.
export const TIMETABLE_POLL_HOURS_UTC = [21, 1, 5, 9]; // ~06:00, 10:00, 14:00, 18:00 KST
export const SCHEDULE_SYNC_HOUR_UTC = 3; // ~12:00 KST
