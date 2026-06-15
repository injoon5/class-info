import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Global superadmin gate. The password lives in `settings` under this key so it
// can be rotated from the superadmin page (or the Convex CLI). Change the
// default immediately after first deploy:
//   npx convex run superadmin:setPassword '{"password":"change-me","newPassword":"..."}'
const SUPERADMIN_KEY = "superadmin_password";
const DEFAULT_SUPERADMIN = "change-me";

const REGISTRATION_ENABLED_KEY = "registration_enabled";
const REGISTRATION_CODE_KEY = "registration_code";

async function getSetting(ctx: any, key: string): Promise<string | null> {
  const setting = await ctx.db
    .query("settings")
    .withIndex("by_key", (q: any) => q.eq("key", key))
    .first();
  return setting?.value ?? null;
}

async function putSetting(ctx: any, key: string, value: string): Promise<void> {
  const existing = await ctx.db
    .query("settings")
    .withIndex("by_key", (q: any) => q.eq("key", key))
    .first();
  if (existing) {
    await ctx.db.patch(existing._id, { value });
  } else {
    await ctx.db.insert("settings", { key, value });
  }
}

async function assertSuper(ctx: any, password: string): Promise<void> {
  const stored = (await getSetting(ctx, SUPERADMIN_KEY)) ?? DEFAULT_SUPERADMIN;
  if (password !== stored) throw new Error("인증에 실패했습니다.");
}

export const verify = query({
  args: { password: v.string() },
  handler: async (ctx, { password }) => {
    const stored = (await getSetting(ctx, SUPERADMIN_KEY)) ?? DEFAULT_SUPERADMIN;
    return password === stored;
  },
});

// Full tenant + config snapshot for the superadmin dashboard.
export const overview = query({
  args: { password: v.string() },
  handler: async (ctx, { password }) => {
    await assertSuper(ctx, password);

    const schools = await ctx.db.query("schools").collect();
    const classes = await ctx.db.query("classes").collect();
    const enabled = await getSetting(ctx, REGISTRATION_ENABLED_KEY);
    const code = await getSetting(ctx, REGISTRATION_CODE_KEY);

    const bySchool = new Map<string, Array<{ grade: number; classNo: number }>>();
    for (const c of classes) {
      const arr = bySchool.get(c.schoolId) ?? [];
      arr.push({ grade: c.grade, classNo: c.classNo });
      bySchool.set(c.schoolId, arr);
    }

    return {
      config: {
        enabled: enabled === null ? true : enabled === "true",
        code: code ?? "",
      },
      totals: { schools: schools.length, classes: classes.length },
      schools: schools
        .map((s) => ({
          _id: s._id,
          subdomain: s.subdomain,
          schoolName: s.schoolName,
          schoolCode: s.schoolCode,
          createdAt: s.createdAt,
          classes: (bySchool.get(s._id) ?? []).sort(
            (a, b) => a.grade - b.grade || a.classNo - b.classNo
          ),
        }))
        .sort((a, b) => a.subdomain.localeCompare(b.subdomain)),
    };
  },
});

export const setRegistration = mutation({
  args: { password: v.string(), enabled: v.boolean(), code: v.optional(v.string()) },
  handler: async (ctx, { password, enabled, code }) => {
    await assertSuper(ctx, password);
    await putSetting(ctx, REGISTRATION_ENABLED_KEY, enabled ? "true" : "false");
    if (code !== undefined) {
      await putSetting(ctx, REGISTRATION_CODE_KEY, code);
    }
  },
});

export const setPassword = mutation({
  args: { password: v.string(), newPassword: v.string() },
  handler: async (ctx, { password, newPassword }) => {
    await assertSuper(ctx, password);
    if (newPassword.trim().length < 4) {
      throw new Error("새 비밀번호는 4자 이상이어야 합니다.");
    }
    await putSetting(ctx, SUPERADMIN_KEY, newPassword);
  },
});
