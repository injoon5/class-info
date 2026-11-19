import { internalMutation, query } from "./_generated/server";
import { v } from "convex/values";
import { R2 } from "@convex-dev/r2";
import { components } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { adminMutation } from "./auth";
import { FILES_BASE_URL } from "./config";
import {
  ATTACHMENT_MAX_BYTES,
  MAX_ATTACHMENTS,
  isAttachmentType,
  publicFile,
  type PublicFile,
} from "./validators";

// A file belongs to whichever notices list it. One no notice lists is
// garbage: an upload abandoned in the editor or an attachment removed on
// save. `collectOrphans` deletes those once they are old enough that no
// editor can still be about to save them.
const ORPHAN_GRACE_MS = 24 * 60 * 60 * 1000;

const STORAGE_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const r2 = new R2(components.r2);

export function projectFile(file: Doc<"files">): PublicFile {
  return {
    _id: file._id,
    name: file.name,
    type: file.type,
    size: file.size,
    url: `${FILES_BASE_URL}/${file.storageId}`,
  };
}

// The R2 component's own `generateUploadUrl` takes no args, so it can't check
// the admin session; this one is the only way to get an upload URL.
export const generateUploadUrl = adminMutation({
  args: {},
  returns: v.object({ key: v.string(), url: v.string() }),
  handler: async () => await r2.generateUploadUrl(),
});

// Records an object the browser just PUT to the upload URL.
export const recordUpload = adminMutation({
  args: { storageId: v.string(), name: v.string(), type: v.string(), size: v.number() },
  returns: v.id("files"),
  handler: async (ctx, { storageId, name, type, size }) => {
    if (!STORAGE_ID_RE.test(storageId)) throw new Error("Invalid storage id");
    if (!Number.isFinite(size) || size < 0 || size > ATTACHMENT_MAX_BYTES) {
      throw new Error("Invalid file size");
    }
    if (!isAttachmentType(type)) throw new Error("Invalid file type");
    const existing = await ctx.db
      .query("files")
      .withIndex("by_storage_id", (q) => q.eq("storageId", storageId))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, { name, type, size });
      return existing._id;
    }
    return await ctx.db.insert("files", { name, type, size, storageId, uploadedAt: Date.now() });
  },
});

export const getFiles = query({
  args: { fileIds: v.array(v.id("files")) },
  returns: v.array(publicFile),
  handler: async (ctx, { fileIds }) => {
    const unique = [...new Set(fileIds)].slice(0, MAX_ATTACHMENTS);
    const rows = await Promise.all(unique.map((id) => ctx.db.get(id)));
    return rows.filter((f): f is Doc<"files"> => f !== null).map(projectFile);
  },
});

export const collectOrphans = internalMutation({
  args: {},
  returns: v.object({ deleted: v.number() }),
  handler: async (ctx) => {
    const cutoff = Date.now() - ORPHAN_GRACE_MS;
    const candidates = await ctx.db
      .query("files")
      .withIndex("by_creation_time", (q) => q.lt("_creationTime", cutoff))
      .collect();
    if (candidates.length === 0) return { deleted: 0 };

    const listed = new Set<Id<"files">>();
    for (const notice of await ctx.db.query("notices").collect()) {
      for (const id of notice.files ?? []) listed.add(id);
    }
    let deleted = 0;
    for (const file of candidates) {
      if (listed.has(file._id)) continue;
      await r2.deleteObject(ctx, file.storageId);
      await ctx.db.delete(file._id);
      deleted++;
    }
    return { deleted };
  },
});
