# Class Info

A real-time class board: notices, timetable, meals, calendar. SvelteKit + Convex.

This repo is meant to be **forked per class**. Identity, hours, and branding live in one file — edit that, deploy, done.

## Fork this for your class

1. Fork the repo.
2. Edit [`packages/backend/convex/class.ts`](packages/backend/convex/class.ts). That is the only place class-specific values belong:

   | Field | What it is |
   | --- | --- |
   | `school.code` | 7-digit NEIS 행정표준코드 ([schoolinfo.go.kr](https://www.schoolinfo.go.kr) → 학교 정보) |
   | `school.grade` / `school.classno` | 학년 / 반. `site.label` and `site.shortLabel` follow these. |
   | `site.name` / `site.url` | Header wordmark and Open Graph origin (no trailing slash). |
   | `hours.dayRollover` | KST hour the home page flips to the next school day. `16` = 4pm. |
   | `hours.dinnerEnd` | KST hour today's 석식 is treated as served. `19` = 7pm. Must be later than the rollover. |
   | `site.analytics` | Set `false` unless you want the onedollarstats collector. |

3. If you change `apis.files`, also update the CSP `connect-src` host in [`apps/web/svelte.config.js`](apps/web/svelte.config.js).
4. Set up Convex + Vercel (below). Change the admin PIN before the site is public.

Agents doing this for you: see [`AGENTS.md`](AGENTS.md).

## Local development

```bash
pnpm install
cp apps/web/.env.example apps/web/.env   # any URL-shaped PUBLIC_CONVEX_URL is fine for typecheck
pnpm dev:setup                           # creates/links a Convex project
pnpm dev                                 # web on :5173 + Convex
```

Admin is `/admin`. Until you set a PIN, `1234` works — then immediately:

```bash
cd packages/backend
npx convex run internal/settings:setPin '{"newPin":"8472"}'
```

Use `npx convex dev` for backend work. Never `npx convex deploy` except production.

## Deploy

The Vercel project root is `apps/web`. The build script deploys Convex first, then the SvelteKit app.

1. Create a Convex project (`pnpm dev:setup`) and copy the **production** deploy key.
2. New Vercel project → root directory `apps/web`.
3. Set `CONVEX_DEPLOY_KEY` (and nothing else for a basic setup — `PUBLIC_CONVEX_URL` is injected by the Convex deploy step).
4. File uploads need Cloudflare R2 wired to the `@convex-dev/r2` component in the Convex dashboard. Meals / timetable / schedule work without it.

Preview deploys start with an empty Convex database. The build hydrates meals, timetable, and schedule from the school APIs; notices do not copy from production.

## What’s in here

```
apps/web/                 SvelteKit UI
packages/backend/convex/  Schema, queries, crons, class.ts
```

- **공지** — markdown notices with due dates, grouped current/past
- **시간표** — this week / next week / standing timetable, substitutions from the school feed
- **급식** — lunch (and dinner when the school serves it)
- **일정** — NEIS calendar plus custom events and D-day flags

Korean school data (timetable, meals, schedule) is pulled from `CLASS.apis.schoolData`. Forks keep that URL and just change the school code.

## Scripts

| Command | |
| --- | --- |
| `pnpm dev` | Web + Convex |
| `pnpm dev:web` / `pnpm dev:server` | One side only |
| `pnpm test` | Backend vitest (`convex/*.test.ts`, not deployed as functions) |
| `pnpm check-types` | Turbo typecheck. Web reads `PUBLIC_CONVEX_URL` but makes no network calls. |
| `pnpm build` | Production build |
