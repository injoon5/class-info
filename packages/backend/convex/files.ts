import { internalMutation, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { R2 } from "@convex-dev/r2";
import { components } from "./_generated/api";
import { requireAdmin } from "./auth";

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
    
    // Extract file info from key if needed
    const fileName = key.split('/').pop() || key;
    
    await ctx.db.insert("files", {
      name: fileName,
      type: "unknown", // We'll set this from the client
      size: 0, // We'll set this from the client
      url,
      storageId: key,
      uploadedAt: Date.now(),
    });
  },
});

// Unused by clients; kept internal-only to avoid an anonymous write path.
export const createFileRecord = internalMutation({
  args: {
    name: v.string(),
    type: v.string(),
    size: v.number(),
    url: v.string(),
    storageId: v.string(),
  },
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
  handler: async (ctx, { fileId, name, type, size }) => {
    await ctx.db.patch(fileId, {
      name,
      type,
      size,
    });
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
  handler: async (ctx, { sessionToken, storageId, name, type, size }) => {
    await requireAdmin(ctx, sessionToken);
    const file = await ctx.db
      .query("files")
      .filter((q) => q.eq(q.field("storageId"), storageId))
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
  handler: async (ctx, { fileId }) => {
    return await ctx.db.get(fileId);
  },
});

export const deleteFile = mutation({
  args: { sessionToken: v.string(), fileId: v.id("files") },
  handler: async (ctx, { sessionToken, fileId }) => {
    await requireAdmin(ctx, sessionToken);
    const file = await ctx.db.get(fileId);
    if (!file) {
      throw new Error("File not found");
    }
    
    // Delete from R2 storage
    try {
      await r2.deleteObject(ctx, file.storageId);
    } catch (error) {
      console.error("Failed to delete file from R2:", error);
      // Continue with database deletion even if R2 deletion fails
    }
    
    // Delete from database
    await ctx.db.delete(fileId);
  },
});

export const getNoticeFiles = query({
  args: { noticeId: v.id("notices") },
  handler: async (ctx, { noticeId }) => {
    const notice = await ctx.db.get(noticeId);
    if (!notice?.files) {
      return [];
    }
    
    const files = await Promise.all(
      notice.files.map(fileId => ctx.db.get(fileId))
    );
    
    return files.filter(Boolean);
  },
});