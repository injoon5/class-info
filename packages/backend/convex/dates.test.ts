import { describe, expect, test } from "vitest";
import {
  addDaysYyyymmdd,
  closedYmdsFromSchedule,
  DAY_ROLLOVER_HOUR_KST,
  DINNER_END_HOUR_KST,
  isAtOrAfterDayRollover,
  isAtOrAfterDinnerEnd,
  isSchoolYmd,
  isVacationTitle,
  relativeDayLabel,
  resolveSchoolDisplayYmd,
  weekOffsetBetween,
  ymdWeekday,
  type ScheduleHint,
  SCHOOL_DAY_LOOKAHEAD,
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

// Mirrors schedule.ts scanSchoolDays(): the index is read over a window that
// reaches SCHOOL_DAY_LOOKAHEAD days *behind* today, and closures are derived
// from exactly the rows that window returns.
function displayDayFor(today: string, afterRollover: boolean, all: ScheduleHint[]) {
  const scanStart = addDaysYyyymmdd(today, -SCHOOL_DAY_LOOKAHEAD);
  const scanEnd = addDaysYyyymmdd(today, SCHOOL_DAY_LOOKAHEAD + 7);
  const rows = all.filter((r) => r.date >= scanStart && r.date <= scanEnd);
  return resolveSchoolDisplayYmd(today, afterRollover, closedYmdsFromSchedule(rows, scanStart, scanEnd));
}

describe("ymdWeekday / weekOffsetBetween", () => {
  test("weekday is timezone-independent", () => {
    expect(ymdWeekday(MON)).toBe(1);
    expect(ymdWeekday(FRI)).toBe(5);
    expect(ymdWeekday(SUN)).toBe(0);
  });

  test("Sunday belongs to the week that just ended, so Monday is a week ahead", () => {
    expect(weekOffsetBetween(THU, FRI)).toBe(0);
    expect(weekOffsetBetween(FRI, NEXT_MON)).toBe(1);
    expect(weekOffsetBetween(SUN, NEXT_MON)).toBe(1);
    expect(weekOffsetBetween(MON, addDaysYyyymmdd(MON, 14))).toBe(2);
  });
});

describe("rollover hours", () => {
  // Both read local fields off a KST-shifted Date, so build the probe the same way.
  const at = (hour: number) => new Date(2026, 7, 20, hour, 30);

  test("the day rollover flips at DAY_ROLLOVER_HOUR_KST", () => {
    expect(isAtOrAfterDayRollover(at(DAY_ROLLOVER_HOUR_KST - 1))).toBe(false);
    expect(isAtOrAfterDayRollover(at(DAY_ROLLOVER_HOUR_KST))).toBe(true);
  });

  // Home leads with today's 석식 between these two hours.
  test("dinner stays pending until DINNER_END_HOUR_KST", () => {
    expect(DINNER_END_HOUR_KST).toBeGreaterThan(DAY_ROLLOVER_HOUR_KST);
    expect(isAtOrAfterDinnerEnd(at(DAY_ROLLOVER_HOUR_KST))).toBe(false);
    expect(isAtOrAfterDinnerEnd(at(DINNER_END_HOUR_KST - 1))).toBe(false);
    expect(isAtOrAfterDinnerEnd(at(DINNER_END_HOUR_KST))).toBe(true);
    expect(isAtOrAfterDinnerEnd(at(23))).toBe(true);
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
});

describe("resolveSchoolDisplayYmd", () => {
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
    for (let i = 0; i <= 200; i++) closed.add(addDaysYyyymmdd(THU, i));
    const fallback = resolveSchoolDisplayYmd(THU, false, closed);
    expect(fallback).toBe(FRI);
    expect(ymdWeekday(fallback)).toBeGreaterThanOrEqual(1);
    expect(ymdWeekday(fallback)).toBeLessThanOrEqual(5);
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
