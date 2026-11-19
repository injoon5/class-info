import { ConvexError, v } from "convex/values";
import { customMutation } from "convex-helpers/server/customFunctions";
import { mutation, type QueryCtx } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { UNAUTHORIZED } from "./validators";

export async function findSession(ctx: QueryCtx, token: string): Promise<Doc<"sessions"> | null> {
  if (!token) return null;
  return await ctx.db
    .query("sessions")
    .withIndex("by_token", (q) => q.eq("token", token))
    .first();
}

/**
 * A public mutation only a logged-in admin can run. It takes the bearer token
 * issued by `settings.login` as `sessionToken`, checked before the handler
 * runs; the handler never sees it.
 */
export const adminMutation = customMutation(mutation, {
  args: { sessionToken: v.string() },
  input: async (ctx, { sessionToken }) => {
    const session = await findSession(ctx, sessionToken);
    if (!session || session.expiresAt <= Date.now()) throw new ConvexError(UNAUTHORIZED);
    return { ctx: {}, args: {} };
  },
});
