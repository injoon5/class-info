import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

// Same school the production crons poll. Preview deployments start empty
// (Convex never clones prod data), so we refill from the public school APIs.
const SCHOOL_CODE = "7010208";

export const hydrate = internalAction({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    await Promise.all([
      ctx.runAction(internal.timetable.fetchAndSave, {
        grade: 1,
        classno: 3,
        week: 0,
        schoolcode: SCHOOL_CODE,
      }),
      ctx.runAction(internal.timetable.fetchAndSave, {
        grade: 1,
        classno: 3,
        week: 1,
        schoolcode: SCHOOL_CODE,
      }),
      ctx.runAction(internal.meals.fetchWeek, {
        schoolcode: SCHOOL_CODE,
        offsetWeeks: 0,
      }),
      ctx.runAction(internal.meals.fetchWeek, {
        schoolcode: SCHOOL_CODE,
        offsetWeeks: 1,
      }),
      ctx.runAction(internal.schedule.fetchScheduleWindow, {
        schoolcode: SCHOOL_CODE,
      }),
    ]);
    return null;
  },
});
