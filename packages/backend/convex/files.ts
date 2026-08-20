import { mutation, query, type MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { R2 } from "@convex-dev/r2";
import { components } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { requireAdmin } from "./auth";
import { fileDoc } from "./validators";
import { FILES_BASE_URL } from "./config";

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPE_PREFIXES = ["image/", "application/pdf"] as const;
const STORAGE_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const r2 = new R2(components.r2);

function assertFileMeta(type: string, size: number): void {
  if (!Number.isFinite(size) || size < 0 || size > MAX_FILE_BYTES) {
    throw new Error("Invalid file size");
  }
  if (!ALLOWED_TYPE_PREFIXES.some((prefix) => type.startsWith(prefix))) {
    throw new Error("Invalid file type");
  }
}

function assertStorageId(storageId: string): void {
  if (!STORAGE_ID_RE.test(storageId)) {
    throw new Error("Invalid storage id");
  }
}

function publicFileUrl(key: string): string {
  return `${FILES_BASE_URL}/${key}`;
}

/**
 * Admin-only signed PUT URL. The R2 clientApi `generateUploadUrl` mutation
 * takes no args, so it cannot see our session cookie/token — that path is
 * intentionally not exported.
 */
export const generateUploadUrl = mutation({
  args: { sessionToken: v.string() },
  returns: v.object({ key: v.string(), url: v.string() }),
  handler: async (ctx, { sessionToken }) => {
    await requireAdmin(ctx, sessionToken);
    return await r2.generateUploadUrl();
  },
});

export const updateFileMetadataByStorageId = mutation({
  args: {
    sessionToken: v.string(),
    storageId: v.string(),
    name: v.string(),
    type: v.string(),
    size: v.number(),
  },
  returns: v.id("files"),
  handler: async (ctx, { sessionToken, storageId, name, type, size }) => {
    await requireAdmin(ctx, sessionToken);
    assertStorageId(storageId);
    assertFileMeta(type, size);
    const file = await ctx.db
      .query("files")
      .withIndex("by_storage_id", (q) => q.eq("storageId", storageId))
      .first();

    const url = publicFileUrl(storageId);
    if (!file) {
      return await ctx.db.insert("files", {
        name,
        type,
        size,
        url,
        storageId,
        uploadedAt: Date.now(),
      });
    }

    await ctx.db.patch(file._id, {
      name,
      type,
      size,
      url,
    });

    return file._id;
  },
});

export const getFiles = query({
  args: { fileIds: v.array(v.id("files")) },
  returns: v.array(fileDoc),
  handler: async (ctx, { fileIds }) => {
    const unique = [...new Set(fileIds)].slice(0, 32);
    const rows = await Promise.all(unique.map((id) => ctx.db.get(id)));
    return rows.filter((f): f is NonNullable<typeof f> => f !== null);
  },
});

// Delete file records and their backing R2 objects. Shared by deleteFile and
// notices.remove (cascade) so a deleted notice never orphans its attachments.
export async function deleteFilesByIds(
  ctx: MutationCtx,
  fileIds: Id<"files">[]
): Promise<void> {
  const unique = [...new Set(fileIds)];
  if (unique.length === 0) return;

  const notices = await ctx.db.query("notices").collect();
  for (const notice of notices) {
    if (!Array.isArray(notice.files) || notice.files.length === 0) continue;
    const next = notice.files.filter((id) => !unique.includes(id));
    if (next.length !== notice.files.length) {
      await ctx.db.patch(notice._id, { files: next });
    }
  }

  for (const fileId of unique) {
    const file = await ctx.db.get(fileId);
    if (!file) continue;
    try {
      await r2.deleteObject(ctx, file.storageId);
    } catch (error) {
      console.error("Failed to delete file from R2:", error);
      // Continue with database deletion even if R2 deletion fails.
    }
    await ctx.db.delete(fileId);
  }
}

export const deleteFile = mutation({
  args: { sessionToken: v.string(), fileId: v.id("files") },
  returns: v.null(),
  handler: async (ctx, { sessionToken, fileId }) => {
    await requireAdmin(ctx, sessionToken);
    const file = await ctx.db.get(fileId);
    if (!file) {
      throw new Error("File not found");
    }
    await deleteFilesByIds(ctx, [fileId]);
    return null;
  },
});
