import { describe, expect, test } from "vitest";
import {
  CLASS,
  SCHOOL,
  assertClassSettings,
  origin,
  publicFileUrl,
  schoolDataUrl,
} from "./class";

describe("CLASS", () => {
  test("the shipped config is valid", () => {
    expect(() => assertClassSettings()).not.toThrow();
    expect(SCHOOL).toBe(CLASS.school);
  });

  test("labels follow grade and class number", () => {
    expect(CLASS.site.label).toBe(
      `${CLASS.school.grade}학년 ${CLASS.school.classno}반`,
    );
    expect(CLASS.site.shortLabel).toBe(
      `${CLASS.school.grade}-${CLASS.school.classno}`,
    );
  });

  test("dinner outlives the day rollover", () => {
    expect(CLASS.hours.dinnerEnd).toBeGreaterThan(CLASS.hours.dayRollover);
  });

  test("rejects a trailing slash on the site origin", () => {
    expect(() =>
      assertClassSettings({
        ...CLASS,
        site: { ...CLASS.site, url: "https://example.com/" },
      }),
    ).toThrow(/no path or trailing slash/);
  });

  test("rejects a dinner hour that is not after the rollover", () => {
    expect(() =>
      assertClassSettings({
        ...CLASS,
        hours: { dayRollover: 16, dinnerEnd: 16 },
      }),
    ).toThrow(/must be later than dayRollover/);
  });

  test("rejects a malformed school code", () => {
    expect(() =>
      assertClassSettings({
        ...CLASS,
        school: { ...CLASS.school, code: "701" },
      }),
    ).toThrow(/7-digit NEIS code/);
  });
});

describe("url helpers", () => {
  test("strips a trailing slash", () => {
    expect(origin("https://example.com/")).toBe("https://example.com");
  });

  test("builds a school-data URL from CLASS.apis.schoolData", () => {
    expect(
      schoolDataUrl("/timetable", {
        grade: CLASS.school.grade,
        classno: CLASS.school.classno,
        week: 0,
        schoolcode: CLASS.school.code,
      }),
    ).toBe(
      `${CLASS.apis.schoolData}/timetable?grade=${CLASS.school.grade}&classno=${CLASS.school.classno}&week=0&schoolcode=${CLASS.school.code}`,
    );
  });

  test("builds a public file URL from CLASS.apis.files", () => {
    expect(publicFileUrl("abc")).toBe(`${CLASS.apis.files}/abc`);
  });
});
