import { v } from "convex/values";
import { action, internalMutation, internalQuery, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

// The upstream API validates its own responses and, for a few malformed NEIS
// records, returns `{ ok:false, error:{ details:{ summary } } }` with the real
// rows embedded in `summary.found`. Recover the rows in either shape.
function extractRows(data: unknown): any[] {
  if (Array.isArray(data)) return data;
  const summary = (data as any)?.error?.details?.summary;
  if (typeof summary === "string") {
    try {
      const parsed = JSON.parse(summary);
      if (Array.isArray(parsed?.found)) return parsed.found;
    } catch {
      // ignore — fall through to empty
    }
  }
  return [];
}

// Resolve a school from its subdomain slug (used by the frontend layout loader).
export const getBySubdomain = query({
  args: { subdomain: v.string() },
  handler: async (ctx, { subdomain }) => {
    return await ctx.db
      .query("schools")
      .withIndex("by_subdomain", (q) => q.eq("subdomain", subdomain.toLowerCase()))
      .first();
  },
});

export const getByCode = internalQuery({
  args: { schoolCode: v.string() },
  handler: async (ctx, { schoolCode }) => {
    return await ctx.db
      .query("schools")
      .withIndex("by_code", (q) => q.eq("schoolCode", schoolCode))
      .first();
  },
});

// Public: is a school (by NEIS code) already registered? Returns its subdomain so
// the registration UI can reuse it instead of asking for a new one.
export const publicByCode = query({
  args: { schoolCode: v.string() },
  handler: async (ctx, { schoolCode }) => {
    const school = await ctx.db
      .query("schools")
      .withIndex("by_code", (q) => q.eq("schoolCode", schoolCode))
      .first();
    return school
      ? { subdomain: school.subdomain, schoolName: school.schoolName }
      : null;
  },
});

export const getBySubdomainInternal = internalQuery({
  args: { subdomain: v.string() },
  handler: async (ctx, { subdomain }) => {
    return await ctx.db
      .query("schools")
      .withIndex("by_subdomain", (q) => q.eq("subdomain", subdomain.toLowerCase()))
      .first();
  },
});

// Cron / orchestrator helper: every registered school.
export const listAllSchools = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("schools").collect();
  },
});

export const createSchool = internalMutation({
  args: { subdomain: v.string(), schoolCode: v.string(), schoolName: v.string() },
  handler: async (ctx, { subdomain, schoolCode, schoolName }): Promise<Id<"schools">> => {
    return await ctx.db.insert("schools", {
      subdomain: subdomain.toLowerCase(),
      schoolCode,
      schoolName,
      createdAt: Date.now(),
    });
  },
});

// Search NEIS schools by (partial) name — powers the registration combobox.
export type SchoolHit = {
  schoolCode: string;
  schoolName: string;
  region: string;
  kind: string;
};

export const searchByName = action({
  args: { name: v.string() },
  handler: async (_ctx, { name }): Promise<SchoolHit[]> => {
    const q = name.trim();
    if (q.length < 2) return [];
    const url = `https://api.timefor.school/school?schoolname=${encodeURIComponent(q)}`;
    try {
      const res = await fetch(url, { headers: { Accept: "application/json" } });
      const rows = extractRows(await res.json());
      const seen = new Set<string>();
      const hits: SchoolHit[] = [];
      for (const r of rows) {
        const schoolCode = r?.SD_SCHUL_CODE ? String(r.SD_SCHUL_CODE) : "";
        const schoolName = r?.SCHUL_NM ? String(r.SCHUL_NM) : "";
        if (!schoolCode || !schoolName || seen.has(schoolCode)) continue;
        seen.add(schoolCode);
        hits.push({
          schoolCode,
          schoolName,
          region: r?.LCTN_SC_NM ? String(r.LCTN_SC_NM) : "",
          kind: r?.SCHUL_KND_SC_NM ? String(r.SCHUL_KND_SC_NM) : "",
        });
        if (hits.length >= 20) break;
      }
      return hits;
    } catch (err) {
      console.error("[schools.searchByName] fetch failed", err);
      return [];
    }
  },
});
