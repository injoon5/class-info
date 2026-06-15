import { v } from "convex/values";
import { internalMutation } from "./_generated/server";

/**
 * One-time migration from the single-tenant model to multi-tenant.
 *
 * Creates the initial school (default NEIS code 7010208) and its grade 1 /
 * class 3 record, then stamps `classId` onto every existing notice / timetable /
 * file and `schoolId` onto every meal / schedule row.
 *
 * Deploy procedure on a database that already holds single-tenant data:
 *   1. Temporarily relax the new tenant fields to `v.optional(...)` in
 *      schema.ts so the schema push accepts the un-migrated rows.
 *   2. Deploy, then run this mutation:  npx convex run migrate:seedAndBackfill '{"subdomain":"<slug>"}'
 *   3. Restore the required tenant fields and redeploy.
 * On a fresh database you can keep the required fields and just register
 * classes via the /register flow instead.
 */
export const seedAndBackfill = internalMutation({
  args: {
    subdomain: v.string(),
    schoolCode: v.optional(v.string()),
    schoolName: v.optional(v.string()),
    grade: v.optional(v.number()),
    classNo: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const subdomain = args.subdomain.trim().toLowerCase();
    const grade = args.grade ?? 1;
    const classNo = args.classNo ?? 3;

    // Derive school code / name from existing meal rows when not provided.
    const sampleMeal = await ctx.db.query("meals").first();
    const schoolCode = args.schoolCode ?? (sampleMeal as any)?.schoolCode ?? "7010208";
    const schoolName = args.schoolName ?? (sampleMeal as any)?.schoolName ?? "학교";

    // Carry over the previous global admin PIN, if any.
    const pinSetting = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", "admin_pin"))
      .first();
    const pin = pinSetting?.value ?? "1234";

    // Reuse an existing school with this code if the migration is re-run.
    let school = await ctx.db
      .query("schools")
      .withIndex("by_code", (q) => q.eq("schoolCode", schoolCode))
      .first();
    let schoolId = school?._id;
    if (!schoolId) {
      schoolId = await ctx.db.insert("schools", {
        subdomain,
        schoolCode,
        schoolName,
        createdAt: Date.now(),
      });
    }

    let cls = await ctx.db
      .query("classes")
      .withIndex("by_school_grade_class", (q) =>
        q.eq("schoolId", schoolId!).eq("grade", grade).eq("classNo", classNo)
      )
      .first();
    let classId = cls?._id;
    if (!classId) {
      classId = await ctx.db.insert("classes", {
        schoolId,
        grade,
        classNo,
        pin,
        createdAt: Date.now(),
      });
    }

    // Backfill class-scoped tables.
    let notices = 0, timetables = 0, files = 0, meals = 0, schedules = 0;
    for (const n of await ctx.db.query("notices").collect()) {
      if (!(n as any).classId) { await ctx.db.patch(n._id, { classId }); notices++; }
    }
    for (const t of await ctx.db.query("timetables").collect()) {
      if (!(t as any).classId) { await ctx.db.patch(t._id, { classId }); timetables++; }
    }
    for (const f of await ctx.db.query("files").collect()) {
      if (!(f as any).classId) { await ctx.db.patch(f._id, { classId }); files++; }
    }
    // Backfill school-scoped tables.
    for (const m of await ctx.db.query("meals").collect()) {
      if (!(m as any).schoolId) { await ctx.db.patch(m._id, { schoolId }); meals++; }
    }
    for (const s of await ctx.db.query("schedules").collect()) {
      if (!(s as any).schoolId) { await ctx.db.patch(s._id, { schoolId }); schedules++; }
    }

    console.log(
      `[migrate.seedAndBackfill] school=${schoolId} class=${classId} ` +
      `notices=${notices} timetables=${timetables} files=${files} meals=${meals} schedules=${schedules}`
    );
    return { schoolId, classId, subdomain, schoolCode, schoolName, grade, classNo };
  },
});
