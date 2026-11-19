import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";
import { SCHEDULE_POLL_HOUR, TIMEZONE_OFFSET_HOURS, WEEK_POLL_HOURS } from "./config";
import { WEEK_OFFSETS, WEEKLY_FEEDS, YEARLY_FEED } from "./sync";

const crons = cronJobs();

const utcHour = (localHour: number) => (((localHour - TIMEZONE_OFFSET_HOURS) % 24) + 24) % 24;

for (const localHour of WEEK_POLL_HOURS) {
  for (const [name, feed] of Object.entries(WEEKLY_FEEDS)) {
    for (const offsetWeeks of WEEK_OFFSETS) {
      crons.daily(
        `fetch ${name} week+${offsetWeeks} @${localHour}h`,
        { hourUTC: utcHour(localHour), minuteUTC: offsetWeeks },
        feed,
        { offsetWeeks }
      );
    }
  }
}

crons.daily("fetch schedule window", { hourUTC: utcHour(SCHEDULE_POLL_HOUR), minuteUTC: 0 }, YEARLY_FEED, {});

crons.interval("purge expired admin sessions", { hours: 1 }, internal.settings.purgeExpiredSessions);
crons.interval("collect orphaned files", { hours: 1 }, internal.files.collectOrphans);

export default crons;
