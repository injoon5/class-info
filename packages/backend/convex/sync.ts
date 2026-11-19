import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import type { FunctionReference } from "convex/server";

type Feed<Args extends Record<string, unknown>> = FunctionReference<"action", "internal", Args, null>;

// Everything pulled from the school API. The crons poll these; a preview
// deployment, which starts empty (Convex never clones prod data), runs them
// all once via `hydrate`.
export const WEEKLY_FEEDS: Record<string, Feed<{ offsetWeeks: number }>> = {
  timetable: internal.timetable.fetchWeek,
  meals: internal.meals.fetchWeek,
};
export const WEEK_OFFSETS = [0, 1] as const; // this week, next week
export const YEARLY_FEED: Feed<Record<string, never>> = internal.schedule.fetchWindow;

export const hydrate = internalAction({
  args: {},
  returns: v.null(),
  handler: async (ctx): Promise<null> => {
    await Promise.all([
      ...Object.values(WEEKLY_FEEDS).flatMap((feed) =>
        WEEK_OFFSETS.map((offsetWeeks) => ctx.runAction(feed, { offsetWeeks }))
      ),
      ctx.runAction(YEARLY_FEED, {}),
    ]);
    return null;
  },
});
