import { v } from "convex/values";
import { action, internalMutation, internalQuery, query } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

// Resolve a class within a school by grade + class number.
export const getClass = query({
  args: { schoolId: v.id("schools"), grade: v.number(), classNo: v.number() },
  handler: async (ctx, { schoolId, grade, classNo }) => {
    return await ctx.db
      .query("classes")
      .withIndex("by_school_grade_class", (q) =>
        q.eq("schoolId", schoolId).eq("grade", grade).eq("classNo", classNo)
      )
      .first();
  },
});

// List classes in a school (public; used to render a school's class directory).
export const listBySchool = query({
  args: { schoolId: v.id("schools") },
  handler: async (ctx, { schoolId }) => {
    return await ctx.db
      .query("classes")
      .withIndex("by_school", (q) => q.eq("schoolId", schoolId))
      .collect();
  },
});

// Cron / orchestrator helper: every class joined with its school's NEIS code.
export const listAllClasses = internalQuery({
  args: {},
  handler: async (ctx) => {
    const classes = await ctx.db.query("classes").collect();
    const out: Array<{
      _id: Id<"classes">;
      schoolId: Id<"schools">;
      grade: number;
      classNo: number;
      schoolCode: string;
    }> = [];
    for (const c of classes) {
      const school = await ctx.db.get(c.schoolId);
      if (!school) continue;
      out.push({
        _id: c._id,
        schoolId: c.schoolId,
        grade: c.grade,
        classNo: c.classNo,
        schoolCode: school.schoolCode,
      });
    }
    return out;
  },
});

export const createClass = internalMutation({
  args: { schoolId: v.id("schools"), grade: v.number(), classNo: v.number(), pin: v.string() },
  handler: async (ctx, { schoolId, grade, classNo, pin }): Promise<Id<"classes">> => {
    return await ctx.db.insert("classes", {
      schoolId,
      grade,
      classNo,
      pin,
      createdAt: Date.now(),
    });
  },
});

// ── Self-service registration ──────────────────────────────────────────────────

export const register = action({
  args: {
    code: v.string(),
    subdomain: v.string(),
    schoolCode: v.string(),
    schoolName: v.string(),
    grade: v.number(),
    classNo: v.number(),
    pin: v.string(),
  },
  handler: async (
    ctx,
    { code, subdomain, schoolCode, schoolName, grade, classNo, pin }
  ): Promise<{ subdomain: string; grade: number; classNo: number }> => {
    // 1. Validate the signup gate.
    const config = await ctx.runQuery(internal.settings.getRegistrationConfig, {});
    if (!config.enabled) throw new Error("등록이 현재 비활성화되어 있습니다.");
    if (config.code && code !== config.code) throw new Error("잘못된 등록 코드입니다.");

    const normalizedSubdomain = subdomain.trim().toLowerCase();
    if (!/^[a-z0-9-]{2,40}$/.test(normalizedSubdomain)) {
      throw new Error("서브도메인은 영문 소문자, 숫자, 하이픈만 사용할 수 있습니다.");
    }

    // 2. Resolve or create the school (one school per NEIS code).
    let school = await ctx.runQuery(internal.schools.getByCode, { schoolCode });

    let schoolIsNew = false;
    if (!school) {
      // New school: the requested subdomain must be free.
      const taken = await ctx.runQuery(internal.schools.getBySubdomainInternal, {
        subdomain: normalizedSubdomain,
      });
      if (taken) throw new Error("이미 사용 중인 서브도메인입니다.");

      await ctx.runMutation(internal.schools.createSchool, {
        subdomain: normalizedSubdomain,
        schoolCode,
        schoolName,
      });
      school = await ctx.runQuery(internal.schools.getByCode, { schoolCode });
      schoolIsNew = true;
      if (!school) throw new Error("학교 생성에 실패했습니다.");
    }

    // 3. Reject duplicate class.
    const existingClass = await ctx.runQuery(internal.classes.getClassInternal, {
      schoolId: school._id,
      grade,
      classNo,
    });
    if (existingClass) throw new Error("이미 등록된 학급입니다.");

    const classId = await ctx.runMutation(internal.classes.createClass, {
      schoolId: school._id,
      grade,
      classNo,
      pin,
    });

    // 4. Kick off initial data fetches.
    for (const week of [0, 1]) {
      try {
        await ctx.runAction(internal.timetable.fetchAndSave, {
          classId,
          grade,
          classno: classNo,
          week,
          schoolcode: school.schoolCode,
        });
      } catch (err) {
        console.error(`[register] timetable fetch failed week=${week}`, err);
      }
    }

    if (schoolIsNew) {
      try {
        await ctx.runAction(internal.meals.fetchCurrentWeek, {
          schoolId: school._id,
          schoolcode: school.schoolCode,
        });
        await ctx.runAction(internal.meals.fetchNextWeek, {
          schoolId: school._id,
          schoolcode: school.schoolCode,
        });
        await ctx.runAction(internal.schedule.fetchScheduleWindow, {
          schoolId: school._id,
          schoolcode: school.schoolCode,
        });
      } catch (err) {
        console.error("[register] school data fetch failed", err);
      }
    }

    return { subdomain: normalizedSubdomain, grade, classNo };
  },
});

// Internal lookups used by `register`.
export const getClassInternal = internalQuery({
  args: { schoolId: v.id("schools"), grade: v.number(), classNo: v.number() },
  handler: async (ctx, { schoolId, grade, classNo }) => {
    return await ctx.db
      .query("classes")
      .withIndex("by_school_grade_class", (q) =>
        q.eq("schoolId", schoolId).eq("grade", grade).eq("classNo", classNo)
      )
      .first();
  },
});
