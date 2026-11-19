/// <reference types="vite/client" />
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { convexTest } from "convex-test";
import r2Test from "@convex-dev/r2/test";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import schema from "./schema";

const modules = import.meta.glob("./**/*.*s");
const DAY = 24 * 60 * 60 * 1000;

beforeEach(() => {
  vi.useFakeTimers();
  for (const name of ["R2_BUCKET", "R2_TOKEN", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_ENDPOINT"]) {
    vi.stubEnv(name, "test");
  }
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

function setup() {
  const t = convexTest(schema, modules);
  // r2's helper registers its nested action retrier at the top level, but
  // convex-test looks it up under the parent component's name.
  r2Test.register({
    registerComponent: (name, componentSchema, componentModules) =>
      t.registerComponent(name === "actionRetrier" ? "r2/actionRetrier" : name, componentSchema, componentModules),
  } as typeof t);
  return t;
}

async function upload(t: ReturnType<typeof setup>, name: string): Promise<Id<"files">> {
  return await t.run((ctx) =>
    ctx.db.insert("files", {
      name,
      type: "image/png",
      size: 1,
      storageId: crypto.randomUUID(),
      uploadedAt: Date.now(),
    })
  );
}

async function names(t: ReturnType<typeof setup>): Promise<string[]> {
  const rows = await t.run((ctx) => ctx.db.query("files").collect());
  return rows.map((f) => f.name).sort();
}

test("collects old files no notice lists, and only those", async () => {
  const t = setup();
  const attached = await upload(t, "attached");
  await upload(t, "abandoned");
  await t.run((ctx) =>
    ctx.db.insert("notices", {
      title: "t",
      subject: "s",
      type: "숙제",
      description: "",
      dueDate: "2026-11-20",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      files: [attached],
    })
  );
  vi.advanceTimersByTime(2 * DAY);
  await upload(t, "uploading"); // an editor that hasn't saved yet

  expect(await t.mutation(internal.files.collectOrphans, {})).toEqual({ deleted: 1 });
  expect(await names(t)).toEqual(["attached", "uploading"]);
});
