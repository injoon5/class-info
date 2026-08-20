/**
 * Class-specific settings. This is the file to edit when forking the repo
 * for another class.
 *
 * Everything that differs between classes lives here: which school/grade/class
 * to poll, what the site is called, and the hours the home page uses to decide
 * "today vs tomorrow". Branding, crons, meal/timetable fetches, and Open Graph
 * tags all read from this object — do not scatter the same values elsewhere.
 *
 * Hours are 0–23 in the timezone given by `timezoneOffsetHours` (KST = 9).
 * `hours.dayRollover` is when home / timetable / notices flip to the next
 * school day (16 = 4pm). `hours.dinnerEnd` is when today's 석식 is treated as
 * served (19 = 7pm). Dinner must be later than the rollover, or tonight's
 * meal disappears the moment the page moves on to tomorrow.
 */

const school = {
  /** 7-digit NEIS 행정표준코드. schoolinfo.go.kr → 학교 정보 → 학교코드. */
  code: "7010208",
  grade: 1,
  classno: 3,
} as const;

export const CLASS = {
  school,

  site: {
    /** Header wordmark, og:site_name, iOS home-screen title. */
    name: "TimeforSchool",
    /** Canonical origin, no trailing slash. Used in Open Graph URLs. */
    url: "https://timefor.school",
    /** Page titles ("오늘 - 1학년 3반"). Stays in sync with grade/classno. */
    label: `${school.grade}학년 ${school.classno}반`,
    /** Notice-detail suffix ("1-3 학급 공지"). */
    shortLabel: `${school.grade}-${school.classno}`,
    /** Set false in a fork that should not hit the onedollarstats collector. */
    analytics: true,
  },

  hours: {
    dayRollover: 16,
    dinnerEnd: 19,
  },

  /** Hours east of UTC. Convex isolates run UTC; date math shifts by this. */
  timezoneOffsetHours: 9,

  apis: {
    /** Public NEIS proxy for timetable / meals / schedule. Forks keep this. */
    schoolData: "https://api.timefor.school",
    /** Public file CDN. Point at your own R2 custom domain after forking. */
    files: "https://files.timefor.school",
  },
} as const;

/** Convenience alias for crons and preview hydrate. */
export const SCHOOL = CLASS.school;

export function origin(url: string): string {
  return url.replace(/\/$/, "");
}

export function schoolDataUrl(
  path: string,
  params: Record<string, string | number>,
): string {
  const base = origin(CLASS.apis.schoolData);
  const query = new URLSearchParams(
    Object.fromEntries(
      Object.entries(params).map(([key, value]) => [key, String(value)]),
    ),
  );
  return `${base}${path.startsWith("/") ? path : `/${path}`}?${query}`;
}

export function publicFileUrl(key: string): string {
  return `${origin(CLASS.apis.files)}/${key}`;
}

export function assertClassSettings(
  settings: {
    school: { code: string; grade: number; classno: number };
    site: { name: string; url: string; label: string; shortLabel: string };
    hours: { dayRollover: number; dinnerEnd: number };
    timezoneOffsetHours: number;
  } = CLASS,
): void {
  if (!/^\d{7}$/.test(settings.school.code)) {
    throw new Error(
      `CLASS.school.code must be a 7-digit NEIS code, got "${settings.school.code}"`,
    );
  }
  if (!Number.isInteger(settings.school.grade) || settings.school.grade < 1) {
    throw new Error(`CLASS.school.grade must be a positive integer`);
  }
  if (!Number.isInteger(settings.school.classno) || settings.school.classno < 1) {
    throw new Error(`CLASS.school.classno must be a positive integer`);
  }
  if (!/^https?:\/\/[^/]+$/i.test(settings.site.url)) {
    throw new Error(
      `CLASS.site.url must be an origin with no path or trailing slash, got "${settings.site.url}"`,
    );
  }
  const { dayRollover, dinnerEnd } = settings.hours;
  for (const [name, hour] of [
    ["dayRollover", dayRollover],
    ["dinnerEnd", dinnerEnd],
  ] as const) {
    if (!Number.isInteger(hour) || hour < 0 || hour > 23) {
      throw new Error(`CLASS.hours.${name} must be an integer 0–23, got ${hour}`);
    }
  }
  if (dinnerEnd <= dayRollover) {
    throw new Error(
      `CLASS.hours.dinnerEnd (${dinnerEnd}) must be later than dayRollover (${dayRollover}) so tonight's 석식 still shows after the page flips to tomorrow`,
    );
  }
  if (!Number.isInteger(settings.timezoneOffsetHours)) {
    throw new Error(`CLASS.timezoneOffsetHours must be an integer`);
  }
}

assertClassSettings();
