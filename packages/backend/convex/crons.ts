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

export default crons;


