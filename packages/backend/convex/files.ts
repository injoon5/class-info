import { internalMutation, mutation, query, type MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { R2 } from "@convex-dev/r2";
import { components } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { requireAdmin } from "./auth";
import { fileDoc } from "./validators";

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPE_PREFIXES = ["image/", "application/pdf"] as const;

export const r2 = new R2(components.r2);

export const { generateUploadUrl, syncMetadata } = r2.clientApi({
  checkUpload: async (_ctx, _bucket) => {
    // NOTE: the R2 clientApi only passes (ctx, bucket) here — no session token —
    // so upload-URL generation cannot be gated by our bearer-token scheme.
    // An anonymous caller could still push objects into the bucket (a
    // storage-fill nuisance), but cannot ATTACH them to a notice: both
    // updateFileMetadataByStorageId and the notice create/update mutations
    // require an admin session. Fully gating uploads needs Convex Auth
    // (ctx.auth identity) wired through the upload flow.
  },
  onUpload: async (ctx, bucket, key) => {
    // Store file metadata in our database with custom domain URL
    const url = `https://files.timefor.school/${key}`;

    const fileName = key.split("/").pop() || key;

    await ctx.db.insert("files", {
      name: fileName,
      type: "unknown",
      size: 0,
      url,
      storageId: key,
      uploadedAt: Date.now(),
    });
  },
});

function assertFileMeta(type: string, size: number): void {
  if (!Number.isFinite(size) || size < 0 || size > MAX_FILE_BYTES) {
    throw new Error("Invalid file size");
  }
  if (!ALLOWED_TYPE_PREFIXES.some((prefix) => type.startsWith(prefix))) {
    throw new Error("Invalid file type");
  }
}

// Unused by clients; kept internal-only to avoid an anonymous write path.
export const createFileRecord = internalMutation({
  args: {
    name: v.string(),
    type: v.string(),
    size: v.number(),
    url: v.string(),
    storageId: v.string(),
  },
  returns: v.id("files"),
  handler: async (ctx, { name, type, size, url, storageId }) => {
    return await ctx.db.insert("files", {
      name,
      type,
      size,
      url,
      storageId,
      uploadedAt: Date.now(),
    });
  },
});

// Unused by clients; kept internal-only to avoid an anonymous write path.
export const updateFileMetadata = internalMutation({
  args: {
    fileId: v.id("files"),
    name: v.string(),
    type: v.string(),
    size: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, { fileId, name, type, size }) => {
    await ctx.db.patch(fileId, {
      name,
      type,
      size,
    });
    return null;
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
    assertFileMeta(type, size);
    const file = await ctx.db
      .query("files")
      .withIndex("by_storage_id", (q) => q.eq("storageId", storageId))
      .first();

    if (!file) {
      throw new Error("File not found");
    }

    await ctx.db.patch(file._id, {
      name,
      type,
      size,
    });

    return file._id;
  },
});

export const getFile = query({
  args: { fileId: v.id("files") },
  returns: v.union(fileDoc, v.null()),
  handler: async (ctx, { fileId }) => {
    return await ctx.db.get(fileId);
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
  for (const fileId of fileIds) {
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
