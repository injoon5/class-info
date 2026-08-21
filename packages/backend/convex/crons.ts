import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";
import { SCHOOL, SCHEDULE_SYNC_HOUR_UTC, TIMETABLE_POLL_HOURS_UTC } from "./config";

const crons = cronJobs();

// Timetable + meals change at most a few times a day, so poll a handful of
// times rather than hourly (was 96 external calls/day).
for (const hourUTC of TIMETABLE_POLL_HOURS_UTC) {
  crons.daily(
    `fetch timetable - this week @${hourUTC}`,
    { hourUTC, minuteUTC: 0 },
    internal.timetable.fetchAndSave,
    { grade: SCHOOL.grade, classno: SCHOOL.classno, week: 0, schoolcode: SCHOOL.code }
  );
  crons.daily(
    `fetch timetable - next week @${hourUTC}`,
    { hourUTC, minuteUTC: 1 },
    internal.timetable.fetchAndSave,
    { grade: SCHOOL.grade, classno: SCHOOL.classno, week: 1, schoolcode: SCHOOL.code }
  );
  crons.daily(
    `fetch meals - this week @${hourUTC}`,
    { hourUTC, minuteUTC: 0 },
    internal.meals.fetchWeek,
    { schoolcode: SCHOOL.code, offsetWeeks: 0 }
  );
  crons.daily(
    `fetch meals - next week @${hourUTC}`,
    { hourUTC, minuteUTC: 1 },
    internal.meals.fetchWeek,
    { schoolcode: SCHOOL.code, offsetWeeks: 1 }
  );
}

crons.daily(
  "fetch schedule window",
  { hourUTC: SCHEDULE_SYNC_HOUR_UTC, minuteUTC: 0 },
  internal.schedule.fetchScheduleWindow,
  { schoolcode: SCHOOL.code }
);

crons.interval(
  "purge expired admin sessions",
  { hours: 1 },
  internal.settings.purgeExpiredSessions
);

export default crons;
