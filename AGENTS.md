# Agent setup

You are configuring a **fork** of this class board for a different class. Do not invent a school code, grade, class number, site name, or domain — use what the user gave you, and ask for anything missing before editing.

The human-facing version of this is `README.md`. This file is the playbook.

## The one file

All class-specific values live in:

```
packages/backend/convex/class.ts
```

Edit that object. Do **not** hardcode `1학년 3반`, `TimeforSchool`, `https://timefor.school`, `16`, or `19` in pages, crons, or date helpers. Those all read from `CLASS`.

| Field | Required | Notes |
| --- | --- | --- |
| `school.code` | yes | 7-digit NEIS 행정표준코드. Lookup: [schoolinfo.go.kr](https://www.schoolinfo.go.kr) → search school → 학교코드. Also printed on 나이스 대국민서비스. |
| `school.grade` | yes | Positive integer. `site.label` / `site.shortLabel` are derived from this + `classno`. |
| `school.classno` | yes | Positive integer. |
| `site.name` | yes | Header wordmark, `og:site_name`, iOS home-screen title. |
| `site.url` | yes | Canonical origin, **no** trailing slash or path. Example: `https://myclass.vercel.app`. |
| `site.label` | derived | Override only if they want a nickname (`햇살반`) instead of `{n}학년 {m}반`. |
| `site.shortLabel` | derived | Override to match a nickname. Used as `{shortLabel} 학급 공지`. |
| `site.analytics` | no | Default `true` hits onedollarstats. Set `false` on a fork unless they ask to keep it. |
| `hours.dayRollover` | yes | 0–23, timezone in `timezoneOffsetHours`. Home / timetable / notices flip to the next school day. Default `16` (4pm KST). |
| `hours.dinnerEnd` | yes | Must be **later** than `dayRollover`. Today's 석식 stays listed until this hour. Default `19` (7pm KST). |
| `timezoneOffsetHours` | yes | Korea is `9`. Leave it unless they are not on KST — the NEIS proxy is Korea-only anyway. |
| `apis.schoolData` | yes | Keep `https://api.timefor.school` unless they have their own NEIS proxy. |
| `apis.files` | yes | Public R2/CDN origin. Changing this also requires updating CSP `connect-src` in `apps/web/svelte.config.js`. |

`assertClassSettings()` runs at module load. A bad code, trailing slash on `site.url`, or `dinnerEnd <= dayRollover` fails tests and Convex startup — that is intentional.

## Procedure

1. Read `packages/backend/convex/class.ts`.
2. Collect school code, grade, class number, site name, public URL, and any hour overrides. If the user said “same hours”, leave `16` / `19`.
3. Patch `CLASS`. Do not retouch `dates.ts` hours, OG tags, or crons — they already import `CLASS`.
4. If `apis.files` changed, update the matching host in `apps/web/svelte.config.js` `kit.csp.directives['connect-src']`.
5. Set `site.analytics` to `false` unless they explicitly want analytics.
6. Run `pnpm test` and `pnpm check-types`. Typecheck needs `apps/web/.env` with a URL-shaped `PUBLIC_CONVEX_URL` (copy `.env.example`).
7. Convex project: `pnpm dev:setup` from the repo root (or `pnpm --filter @class-info/backend dev:setup`). Use `npx convex dev` during development, **never** `npx convex deploy` unless they asked to ship production.
8. Admin PIN: default is `1234` until hashed. Before the site is public, set one:

   ```bash
   cd packages/backend
   npx convex run internal/settings:setPin '{"newPin":"<4-8 digits>"}'
   ```

   There is no in-app change-PIN UI. `/admin` is the only privileged surface.
9. Vercel: project root `apps/web`, env `CONVEX_DEPLOY_KEY` = Convex **production** deploy key. `PUBLIC_CONVEX_URL` is injected by `apps/web/scripts/vercel-deploy.sh`. Preview DBs start empty; the build runs `preview:hydrate`, which pulls meals/timetable/schedule for `CLASS.school`. Notices are not cloned from prod.
10. File uploads are optional. They need Cloudflare R2 credentials on the Convex `@convex-dev/r2` component. Skip unless they asked.

## Do not

- Scatter class name / hours / school code in Svelte pages. Use `CLASS` via `$lib/site` (`pageTitle`, `siteUrl`, `noticeTitle`) or `PageMeta`.
- Change `dates.ts` rollover constants except to keep reading `CLASS.hours`.
- Point `apis.schoolData` at a random host. The timetable/meal/schedule fetchers expect that API’s JSON shape.
- Run `npx convex deploy` as a “try it” step.
- Commit `.env`, Convex deploy keys, or the admin PIN.
- “Helpfully” rewrite Korean copy, notice types (`수행평가` / `숙제` / `준비물` / `기타`), or the meal-type labels.

## After a successful setup

Tell the user:

- Which fields you changed in `class.ts`
- Admin is `/admin`, PIN status (still default vs set)
- That R2 is unset if you skipped it (notice attachments will fail)
- `pnpm dev` to run locally
