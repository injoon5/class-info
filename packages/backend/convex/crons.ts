import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.hourly(
  "fetch timetable - this week",
  { minuteUTC: 0 },
  internal.timetable.fetchAllClasses,
  { week: 0 }
);

crons.hourly(
  "fetch timetable - next week",
  { minuteUTC: 1 },
  internal.timetable.fetchAllClasses,
  { week: 1 }
);

crons.hourly(
  "fetch meals - this week",
  { minuteUTC: 0 },
  internal.meals.fetchAllSchools,
  { offsetWeeks: 0 }
);

crons.hourly(
  "fetch meals - next week",
  { minuteUTC: 1 },
  internal.meals.fetchAllSchools,
  { offsetWeeks: 1 }
);

crons.daily(
  "fetch schedule window",
  { hourUTC: 3, minuteUTC: 0 },
  internal.schedule.fetchAllSchools,
  {}
);

export default crons;
