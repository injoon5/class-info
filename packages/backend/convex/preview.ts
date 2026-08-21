import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { SCHOOL } from "./config";

// Same school the production crons poll. Preview deployments start empty
// (Convex never clones prod data), so we refill from the public school APIs.

export const hydrate = internalAction({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    await Promise.all([
      ctx.runAction(internal.timetable.fetchAndSave, {
        grade: SCHOOL.grade,
        classno: SCHOOL.classno,
        week: 0,
        schoolcode: SCHOOL.code,
      }),
      ctx.runAction(internal.timetable.fetchAndSave, {
        grade: SCHOOL.grade,
        classno: SCHOOL.classno,
        week: 1,
        schoolcode: SCHOOL.code,
      }),
      ctx.runAction(internal.meals.fetchWeek, {
        schoolcode: SCHOOL.code,
        offsetWeeks: 0,
      }),
      ctx.runAction(internal.meals.fetchWeek, {
        schoolcode: SCHOOL.code,
        offsetWeeks: 1,
      }),
      ctx.runAction(internal.schedule.fetchScheduleWindow, {
        schoolcode: SCHOOL.code,
      }),
    ]);
    return null;
  },
});
