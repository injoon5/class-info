import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.hourly(
  "fetch timetable - this week",
  { minuteUTC: 0 },
  internal.timetable.fetchAndSave,
  { grade: 3, classno: 4, week: 0, schoolcode: "7081492" }
);

crons.hourly(
  "fetch timetable - next week",
  { minuteUTC: 1 },
  internal.timetable.fetchAndSave,
  { grade: 3, classno: 4, week: 1, schoolcode: "7081492" }
);

crons.hourly(
  "fetch meals - this week",
  { minuteUTC: 0 },
  internal.meals.fetchCurrentWeek,
  { schoolcode: "7081492" }
);

crons.hourly(
  "fetch meals - next week",
  { minuteUTC: 1 },
  internal.meals.fetchNextWeek,
  { schoolcode: "7081492" }
);

export default crons;


