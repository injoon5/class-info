import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.hourly(
  "fetch timetable - this week",
  { minuteUTC: 0 },
  internal.timetable.fetchAndSave,
  { grade: 1, classno: 3, week: 0, schoolcode: "7010208" }
);

crons.hourly(
  "fetch timetable - next week",
  { minuteUTC: 1 },
  internal.timetable.fetchAndSave,
  { grade: 1, classno: 3, week: 1, schoolcode: "7010208" }
);

crons.hourly(
  "fetch meals - this week",
  { minuteUTC: 0 },
  internal.meals.fetchCurrentWeek,
  { schoolcode: "7010208" }
);

crons.hourly(
  "fetch meals - next week",
  { minuteUTC: 1 },
  internal.meals.fetchNextWeek,
  { schoolcode: "7010208" }
);

crons.daily(
  "fetch schedule - this year",
  { hourUTC: 3, minuteUTC: 0 },
  internal.schedule.fetchThisYear,
  { schoolcode: "7010208" }
);

crons.daily(
  "fetch schedule - next year",
  { hourUTC: 3, minuteUTC: 1 },
  internal.schedule.fetchNextYear,
  { schoolcode: "7010208" }
);

export default crons;


