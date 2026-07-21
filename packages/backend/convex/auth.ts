import type { QueryCtx, MutationCtx } from "./_generated/server";

/**
 * Throws unless `token` matches a live (non-expired) admin session.
 *
 * Every admin-only mutation must call this before mutating. The token is a
 * bearer credential issued by `settings.login` and stored in the `sessions`
 * table; the client attaches it to each privileged mutation call.
 */
export async function requireAdmin(
  ctx: QueryCtx | MutationCtx,
  token: string | undefined | null
): Promise<void> {
  if (!token) throw new Error("Unauthorized");
  const session = await ctx.db
    .query("sessions")
    .withIndex("by_token", (q) => q.eq("token", token))
    .first();
  if (!session || session.expiresAt <= Date.now()) {
    throw new Error("Unauthorized");
  }
}
