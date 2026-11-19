import { describe, expect, test } from "vitest";
import { DAY_ROLLOVER_HOUR, DINNER_END_HOUR, TIMEZONE_OFFSET_HOURS } from "./config";
import {
  addDays,
  closedYmdsFromSchedule,
  dayLabel,
  daysBetween,
  ddayLabel,
  isAfterDinner,
  isSchoolYmd,
  isVacationTitle,
  mondayOf,
  relativeDayLabel,
  resolveDisplayDay,
  scheduleWindow,
  schoolClock,
  weekdayOf,
  ymdFromIso,
  type ScheduleHint,
} from "./dates";

// Reference week: Mon 20260817 … Fri 20260821, Sat 22, Sun 23, Mon 24.
const MON = "20260817";
const THU = "20260820";
const FRI = "20260821";
const SAT = "20260822";
const SUN = "20260823";
const NEXT_MON = "20260824";

const school = (date: string, title: string, eventType = ""): ScheduleHint => ({
  date,
  title,
  eventType,
  source: "school",
});
const custom = (date: string, title: string): ScheduleHint => ({
  date,
  title,
  source: "custom",
});

// The display day for `today`, with closures read from the whole year. How
// far back the real query scans is covered in schedule.test.ts.
function displayDayFor(today: string, afterRollover: boolean, events: ScheduleHint[]) {
  return resolveDisplayDay({ today, afterRollover }, closedYmdsFromSchedule(events, "20260101", "20261231"));
}

describe("weekdayOf / mondayOf", () => {
  test("weekday is timezone-independent", () => {
    expect(weekdayOf(MON)).toBe(1);
    expect(weekdayOf(FRI)).toBe(5);
    expect(weekdayOf(SUN)).toBe(0);
  });

  test("Sunday belongs to the week that just ended", () => {
    expect(mondayOf(THU)).toBe(MON);
    expect(mondayOf(SUN)).toBe(MON);
    expect(mondayOf(NEXT_MON)).toBe(NEXT_MON);
  });
});

describe("school clock", () => {
  // An instant at `hour`:30 on 2026-08-20 in the school's zone.
  const at = (hour: number) => Date.UTC(2026, 7, 20, hour - TIMEZONE_OFFSET_HOURS, 30);

  test("today is the school-zone date, not the UTC one", () => {
    expect(schoolClock(at(1)).today).toBe(THU); // still the 19th in UTC
    expect(schoolClock(at(23)).today).toBe(THU);
  });

  test("the day rollover flips at DAY_ROLLOVER_HOUR", () => {
    expect(schoolClock(at(DAY_ROLLOVER_HOUR - 1)).afterRollover).toBe(false);
    expect(schoolClock(at(DAY_ROLLOVER_HOUR)).afterRollover).toBe(true);
  });

  // Home leads with today's 석식 between these two hours.
  test("dinner stays pending until DINNER_END_HOUR", () => {
    expect(isAfterDinner(at(DAY_ROLLOVER_HOUR))).toBe(false);
    expect(isAfterDinner(at(DINNER_END_HOUR - 1))).toBe(false);
    expect(isAfterDinner(at(DINNER_END_HOUR))).toBe(true);
    expect(isAfterDinner(at(23))).toBe(true);
  });
});

describe("relativeDayLabel", () => {
  test("labels only the two days it can actually name", () => {
    expect(relativeDayLabel(THU, THU)).toBe("오늘");
    expect(relativeDayLabel(FRI, THU)).toBe("내일");
    expect(relativeDayLabel(NEXT_MON, THU)).toBe("");
  });

  // The regression: the label used to be computed against the *display* day,
  // so every weekend rendered Monday's events as "오늘".
  test("a display day several days out is never called 오늘", () => {
    expect(relativeDayLabel(NEXT_MON, SAT)).toBe("");
    expect(relativeDayLabel(NEXT_MON, SUN)).toBe("내일");
  });

  test("dayLabel falls back to the short date", () => {
    expect(dayLabel(FRI, THU)).toBe("내일");
    expect(dayLabel(NEXT_MON, THU)).toBe("8/24 (월)");
  });
});

describe("ymdFromIso", () => {
  test("accepts only real dates", () => {
    expect(ymdFromIso("2026-08-20")).toBe(THU);
    expect(ymdFromIso("2026-02-30")).toBeNull();
    expect(ymdFromIso("20260820")).toBeNull();
  });
});

describe("resolveDisplayDay", () => {
  test("shows today before the rollover, tomorrow after it", () => {
    expect(displayDayFor(THU, false, [])).toBe(THU);
    expect(displayDayFor(THU, true, [])).toBe(FRI);
  });

  test("skips the weekend", () => {
    expect(displayDayFor(FRI, true, [])).toBe(NEXT_MON);
    expect(displayDayFor(SAT, false, [])).toBe(NEXT_MON);
    expect(displayDayFor(SUN, false, [])).toBe(NEXT_MON);
  });

  test("skips a 휴업일 to the next open weekday", () => {
    expect(displayDayFor(FRI, true, [school(NEXT_MON, "개교기념일", "휴업일")])).toBe("20260825");
  });

  test("falls back to the next weekday when nothing is open in the lookahead", () => {
    const closed = new Set<string>();
    for (let i = 0; i <= 200; i++) closed.add(addDays(THU, i));
    const fallback = resolveDisplayDay({ today: THU, afterRollover: false }, closed);
    expect(fallback).toBe(FRI);
    expect(weekdayOf(fallback)).toBeGreaterThanOrEqual(1);
    expect(weekdayOf(fallback)).toBeLessThanOrEqual(5);
  });
});

describe("vacation handling", () => {
  // NEIS tags only the first day of a break, so the span has to be filled in.
  const summer = [
    school("20260717", "여름방학식"),
    school("20260720", "여름방학"),
    school("20260818", "개학"),
  ];

  test("방학식 is still a school day", () => {
    expect(isVacationTitle("여름방학식")).toBe(false);
    expect(displayDayFor("20260717", false, summer)).toBe("20260717");
  });

  test("the whole break resolves to 개학, not just its first day", () => {
    // The bug: only the first day worked, because the scan started at today
    // and the marker fell out of the window from day two onward.
    for (const day of ["20260720", "20260721", "20260731", "20260817"]) {
      expect(displayDayFor(day, false, summer)).toBe("20260818");
    }
  });

  test("개학 itself is a school day", () => {
    expect(displayDayFor("20260818", false, summer)).toBe("20260818");
  });

  test("a custom event mentioning 방학 does not close the school", () => {
    expect(displayDayFor(THU, true, [custom(NEXT_MON, "방학 과제 제출일")])).toBe(FRI);
    expect(displayDayFor(NEXT_MON, false, [custom(NEXT_MON, "방학 과제 제출일")])).toBe(NEXT_MON);
  });

  test("a school title that merely contains 방학 does not close the school", () => {
    expect(isVacationTitle("방학중 돌봄교실")).toBe(false);
    expect(displayDayFor(NEXT_MON, false, [school(NEXT_MON, "방학중 돌봄교실")])).toBe(NEXT_MON);
  });

  test("real break markers still match", () => {
    for (const title of ["방학", "여름방학", "겨울방학", "겨울방학 시작"]) {
      expect(isVacationTitle(title)).toBe(true);
    }
  });

  test("an unterminated break closes the rest of the window", () => {
    const closed = closedYmdsFromSchedule(
      [school(NEXT_MON, "여름방학")],
      MON,
      "20261231",
    );
    expect(isSchoolYmd(NEXT_MON, closed)).toBe(false);
    expect(isSchoolYmd("20261231", closed)).toBe(false);
    expect(isSchoolYmd(FRI, closed)).toBe(true);
  });
});

describe("ddayLabel", () => {
  test("counts whole calendar days ahead", () => {
    expect(ddayLabel(FRI, THU)).toBe("D-1");
    expect(ddayLabel(NEXT_MON, THU)).toBe("D-4");
    expect(ddayLabel("20260920", THU)).toBe("D-31");
  });

  test("the day itself is D-DAY, never D-0", () => {
    expect(ddayLabel(THU, THU)).toBe("D-DAY");
  });

  test("a date already gone counts up", () => {
    expect(ddayLabel(MON, THU)).toBe("D+3");
  });

  test("crosses month and year boundaries by real days, not arithmetic on parts", () => {
    expect(daysBetween("20261231", "20270101")).toBe(1);
    expect(daysBetween("20260228", "20260301")).toBe(1); // 2026 is not a leap year
    expect(ddayLabel("20270101", "20261225")).toBe("D-7");
  });

  test("rejects a malformed date rather than counting nonsense", () => {
    expect(() => ddayLabel("2026-08-20", THU)).toThrow();
  });
});

describe("scheduleWindow", () => {
  test("covers the school year in progress, not the calendar year", () => {
    // January 2027 is still the 2026 school year (March 2026 – February 2027).
    const jan = scheduleWindow("20270115");
    expect([jan.start, jan.end]).toEqual(["20251201", "20270228"]);
    const sep = scheduleWindow("20260924");
    expect([sep.start, sep.end]).toEqual(["20251201", "20270228"]);
  });

  test("rolls over in March and ends on a leap day when there is one", () => {
    const mar = scheduleWindow("20270301");
    expect([mar.start, mar.end]).toEqual(["20261201", "20280229"]);
  });
});
