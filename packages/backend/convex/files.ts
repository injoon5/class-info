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

export const createFileRecord = mutation({
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
    storageId: v.string(),
    name: v.string(),
    type: v.string(),
    size: v.number(),
  },
  handler: async (ctx, { storageId, name, type, size }) => {
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
  args: { fileId: v.id("files") },
  handler: async (ctx, { fileId }) => {
    const file = await ctx.db.get(fileId);
    if (!file) {
      throw new Error("File not found");
    }
    
    // For now, just delete from database
    // R2 file cleanup can be done separately if needed
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