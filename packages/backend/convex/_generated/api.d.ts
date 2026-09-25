/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as auth from "../auth.js";
import type * as config from "../config.js";
import type * as crons from "../crons.js";
import type * as dates from "../dates.js";
import type * as files from "../files.js";
import type * as meals from "../meals.js";
import type * as notices from "../notices.js";
import type * as preview from "../preview.js";
import type * as project from "../project.js";
import type * as schedule from "../schedule.js";
import type * as settings from "../settings.js";
import type * as text from "../text.js";
import type * as timetable from "../timetable.js";
import type * as validators from "../validators.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  config: typeof config;
  crons: typeof crons;
  dates: typeof dates;
  files: typeof files;
  meals: typeof meals;
  notices: typeof notices;
  preview: typeof preview;
  project: typeof project;
  schedule: typeof schedule;
  settings: typeof settings;
  text: typeof text;
  timetable: typeof timetable;
  validators: typeof validators;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  r2: import("@convex-dev/r2/_generated/component.js").ComponentApi<"r2">;
};
