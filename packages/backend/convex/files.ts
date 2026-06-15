import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { R2 } from "@convex-dev/r2";
import { components } from "./_generated/api";

export const r2 = new R2(components.r2);

export const { generateUploadUrl, syncMetadata } = r2.clientApi({
  checkUpload: async (_ctx, _bucket) => {
    // For now, allow all uploads - you can add authentication here later
    // This should not return anything according to types
  },
  // NOTE: the file row (with its owning classId) is created by the client via
  // `updateFileMetadataByStorageId` after upload, so this hook does nothing.
  onUpload: async (_ctx, _bucket, _key) => {},
});

export const createFileRecord = mutation({
  args: {
    classId: v.id("classes"),
    name: v.string(),
    type: v.string(),
    size: v.number(),
    url: v.string(),
    storageId: v.string(),
  },
  handler: async (ctx, { classId, name, type, size, url, storageId }) => {
    return await ctx.db.insert("files", {
      classId,
      name,
      type,
      size,
      url,
      storageId,
      uploadedAt: Date.now(),
    });
  },
});

export const updateFileMetadata = mutation({
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
    classId: v.id("classes"),
    storageId: v.string(),
    name: v.string(),
    type: v.string(),
    size: v.number(),
  },
  handler: async (ctx, { classId, storageId, name, type, size }) => {
    const file = await ctx.db
      .query("files")
      .filter((q) => q.eq(q.field("storageId"), storageId))
      .first();

    if (file) {
      await ctx.db.patch(file._id, { classId, name, type, size });
      return file._id;
    }

    // No row exists yet (R2 onUpload no longer auto-inserts) — create it.
    return await ctx.db.insert("files", {
      classId,
      name,
      type,
      size,
      url: `https://files.timefor.school/${storageId}`,
      storageId,
      uploadedAt: Date.now(),
    });
  },
});

export const getFile = query({
  args: { fileId: v.id("files") },
  handler: async (ctx, { fileId }) => {
    return await ctx.db.get(fileId);
  },
});

export const deleteFile = mutation({
  args: { fileId: v.id("files") },
  handler: async (ctx, { fileId }) => {
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