# Setup: forking this for your own class

This walks through turning the default demo (a specific Korean middle-school
class) into your own class's site. Read [AGENTS.md](AGENTS.md) instead if
you're doing this with a coding agent's help — this file is the reference it
works from.

Everything below assumes you've already run `pnpm install`.

## 1. Create your own Convex project

```bash
pnpm dev:setup
```

This runs `convex dev --configure` in `packages/backend`, which creates (or
links) a Convex project and writes its deployment URL to
`packages/backend/.env.local`. Keep that file out of version control (it
already is, via `.gitignore`) — it's specific to your Convex project, not the
repo.

Copy the frontend's env file and drop in the same URL for local dev:

```bash
cp apps/web/.env.example apps/web/.env
```

`apps/web/.env` only needs `PUBLIC_CONVEX_URL`. On Vercel, leave it unset —
`npx convex deploy --cmd` injects it automatically per-deployment (see
`apps/web/scripts/vercel-deploy.sh`).

## 2. Point it at your school

Open **`packages/backend/convex/config.ts`**. This is the one file with every
value you're expected to change:

| Constant | What it controls |
| --- | --- |
| `SCHOOL.code` / `.grade` / `.classno` | Which school and homeroom the timetable/meal/schedule crons fetch |
| `SITE_NAME` | Header title, PWA home-screen name, and OpenGraph `site_name` |
| `SITE_URL` | Canonical production URL, used in absolute `og:url` tags |
| `CLASS_LABEL` | Class label shown in page titles/descriptions (e.g. "1학년 3반") |
| `FILES_BASE_URL` | Public URL notice attachments are served from — **must** point at your own R2 bucket, or your uploads render from someone else's domain. Also update the matching entry in `apps/web/svelte.config.js`'s CSP `connect-src` (that file can't import `config.ts`, so it's a manual mirror) |
| `TIMEZONE_OFFSET_HOURS` | Hours east of UTC (`9` for KST) |
| `DAY_ROLLOVER_HOUR` | Local hour the home page/timetable/meals flip to "tomorrow" |
| `DINNER_END_HOUR` | Local hour after which tonight's dinner stops being "today's" |
| `HOME_EVENT_WINDOW_DAYS`, `HOME_DDAY_LIMIT`, `SCHOOL_DAY_LOOKAHEAD`, `SCHEDULE_RANGE_MAX_DAYS` | How far ahead the home page and calendar look |
| `DEFAULT_ADMIN_PIN`, `ADMIN_SESSION_TTL_MS`, `LOGIN_MAX_FAILS`, `LOGIN_WINDOW_MS`, `LOGIN_LOCKOUT_MS` | Admin login defaults and brute-force throttle |
| `TIMETABLE_POLL_HOURS_UTC`, `SCHEDULE_SYNC_HOUR_UTC` | When the crons poll the school APIs |

### Finding your school's code

The timetable/meal/calendar data comes from
[timefor.school](https://timefor.school), a public API that wraps Korea's
NEIS system. Find your school at
[open.neis.go.kr](https://open.neis.go.kr) (or search
`https://api.timefor.school/timetable?...` with your school's known name) to
get its `SD_SCHUL_CODE` — that's `SCHOOL.code`. `grade`/`classno` select the
homeroom whose timetable gets fetched.

If your school isn't in NEIS (outside Korea, or a different data source
entirely), the timetable/meal/schedule fetchers in `timetable.ts`, `meals.ts`,
and `schedule.ts` will need real rework, not just a config change — this repo
assumes a NEIS-shaped feed.

After editing `config.ts`, restart `pnpm dev:server` (or redeploy) so the
cron schedule and any changed values take effect.

## 3. Set up file storage (Cloudflare R2)

Notice attachments (images, PDFs) go through the `@convex-dev/r2` component
into a Cloudflare R2 bucket:

1. [Create a Cloudflare account](https://cloudflare.com) and
   [an R2 bucket](https://developers.cloudflare.com/r2/buckets/create-buckets/).
2. Add a CORS policy to the bucket allowing `GET`/`PUT` from your dev and
   production origins (see the
   [R2 component README](https://www.npmjs.com/package/@convex-dev/r2) for
   the exact JSON).
3. Create an R2 API token (**Object Read & Write**, scoped to your bucket) and
   set it on your Convex deployment:

   ```bash
   npx convex env set R2_BUCKET <your-bucket-name>
   npx convex env set R2_TOKEN <token-value>
   npx convex env set R2_ACCESS_KEY_ID <access-key-id>
   npx convex env set R2_SECRET_ACCESS_KEY <secret-access-key>
   npx convex env set R2_ENDPOINT <endpoint>
   ```

   Run each `npx convex env set` from `packages/backend` (or pass
   `--prod`/`--preview-name` as needed once you have a production/preview
   deployment).

4. Set `FILES_BASE_URL` in `config.ts` to a public URL in front of that
   bucket — either R2's public bucket URL or your own custom domain.

## 4. Set the admin PIN

The admin panel (`/admin`) is gated by a 4–8 digit PIN, not a user account.
`DEFAULT_ADMIN_PIN` in `config.ts` is only a fallback used until you set a
real one — don't ship with it. Set one via the internal mutation:

```bash
cd packages/backend
npx convex run settings:setPin '{"newPin":"YOUR_NEW_PIN"}'
```

Run this again (with `--prod`) after your first production deploy.

## 5. Branding

- `SITE_NAME`, `SITE_URL`, and `CLASS_LABEL` in `config.ts` cover the header,
  the PWA home-screen title (via a `%site.name%` placeholder in `app.html`
  that `hooks.server.ts` fills in at request time), and every page's
  `<title>`/OpenGraph/Twitter Card tags.
- `apps/web/static/` holds the actual image assets — favicons, apple-touch
  icons, splash screens. Regenerate/replace those with your own branding — a
  favicon generator that outputs the same filenames is the fastest path.
  `apps/web/src/app.html` itself shouldn't need edits beyond what's already
  templated.
- The four notice categories (수행평가/숙제/준비물/기타) are a schema-level
  enum, not a config value — see `packages/backend/convex/schema.ts`
  (`notices.type`) if you want to change them. That's a real schema change:
  update the union there and everywhere it's matched (search for one of the
  Korean labels to find the call sites).

## 6. Deploy

The included `apps/web/scripts/vercel-deploy.sh` runs `convex deploy` and, on
non-production Vercel environments, hydrates a fresh preview database from
the school APIs (preview deployments don't clone production data — notices
are the exception, since they only ever live in Convex, not an upstream
feed).

1. Push this repo to your own GitHub repository.
2. Import it into Vercel, set the root directory to `apps/web`, and use
   `pnpm run build:vercel` as the build command (already wired up in
   `apps/web/vercel.json`).
3. Set the R2 environment variables (step 3) on your **production** Convex
   deployment, and set the admin PIN (step 4) there once it's live.

## 7. Verify

```bash
pnpm check-types   # type-checks both apps — needs apps/web/.env (step 1)
pnpm test          # backend test suite
```

Both run in CI on every pull request (`.github/workflows/ci.yml`).
