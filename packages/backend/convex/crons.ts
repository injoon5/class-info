import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "fetch timetable - this week",
  { minutes: 30 },
  internal.timetable.fetchAndSave,
  { grade: 3, classno: 4, week: 0, schoolcode: "7081492" }
);

crons.interval(
  "fetch timetable - next week",
  { minutes: 30 },
  internal.timetable.fetchAndSave,
  { grade: 3, classno: 4, week: 1, schoolcode: "7081492" }
);

// Meals fetching: run daily at 06:00 KST and weekly on Sunday 20:00 KST to prefill next week
// Convex crons are UTC-based; 06:00 KST = 21:00 UTC previous day, Sunday 20:00 KST = 11:00 UTC Sunday
crons.daily(
  "fetch meals - both weeks (KST 06:00)",
  { hourUTC: 21, minuteUTC: 0 },
  internal.meals.fetchCurrentWeek,
  { schoolcode: "7081492" }
);

crons.daily(
  "fetch meals - next week (KST 06:00)",
  { hourUTC: 21, minuteUTC: 1 },
  internal.meals.fetchNextWeek,
  { schoolcode: "7081492" }
);

export default crons;


