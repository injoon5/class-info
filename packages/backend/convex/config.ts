// The values a fork changes to run this for its own class. Edit and redeploy
// (`pnpm dev:server` / `npx convex deploy`); nothing else needs to change.
//
// Imported by both the Convex backend and the SvelteKit frontend (as
// `@class-info/backend/convex/config`). See SETUP.md for the full walkthrough.

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
// Shown in the header, the Home Screen name (web app manifest and
// `apple-mobile-web-app-title`), and page <title>/OpenGraph tags. Icons and
// startup images are generated separately — see SETUP.md.
export const SITE_NAME = "TimeforSchool";

// Canonical production URL, used in absolute OpenGraph `og:url` tags. No
// trailing slash.
export const SITE_URL = "https://timefor.school";

// Class label shown in page titles and descriptions. Keep it in sync with
// SCHOOL.grade/classno: the display format isn't derivable from the numbers
// in every school's convention.
export const CLASS_LABEL = "1학년 3반";

// Public base URL admin-uploaded files (notice attachments) are served from:
// your R2 bucket's public URL or a custom domain in front of it (see SETUP.md).
export const FILES_BASE_URL = "https://files.timefor.school";

// ── Time ─────────────────────────────────────────────────────────────────
// Hours east of UTC. Convex isolates run in UTC; every "school day" and hour
// below is read in this zone.
export const TIMEZONE_OFFSET_HOURS = 9;

// Home's timetable/meals and a notice's "past" status flip to the next day
// at this local hour.
export const DAY_ROLLOVER_HOUR = 16;

// Today's dinner (석식) is still shown as "today's" until this local hour.
// Between the rollover and this hour, home already shows tomorrow, so
// tonight's dinner is listed first — it's served before tomorrow's lunch.
export const DINNER_END_HOUR = 19;

// Local hours the crons poll the school API: timetable and meals several
// times a day, the year's schedule once.
export const WEEK_POLL_HOURS = [6, 10, 14, 18];
export const SCHEDULE_POLL_HOUR = 12;

// ── Home page ────────────────────────────────────────────────────────────
// How many days past the display day the home page's event list reaches.
export const HOME_EVENT_WINDOW_DAYS = 7;

// How many D-day countdowns the home hero shows.
export const HOME_DDAY_LIMIT = 2;

// ── Admin ────────────────────────────────────────────────────────────────
// Used only until an admin sets a real PIN via settings.setPin — change it
// on day one.
export const DEFAULT_ADMIN_PIN = "1234";
