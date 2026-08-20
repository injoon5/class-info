# AGENTS.md

Instructions for AI coding agents helping someone fork and set up this repo
for their own class. If you're an agent and the user says something like "set
this up for my class" or "point this at my school," this is your playbook.
For architecture/conventions when just writing code (not onboarding a new
fork), see [CLAUDE.md](CLAUDE.md) instead — read that too before editing.

The full human-readable version of everything below is
[SETUP.md](SETUP.md); this file is the same information framed as an agent
task list, with the questions to ask up front.

## 1. Gather what you need before touching files

Ask the user for these — don't guess or invent placeholder values for
anything that ends up in production:

1. **School identity**: school name, and either the NEIS `SD_SCHUL_CODE` or
   enough to look it up (region + school name). Also grade and class number
   for the homeroom timetable. If they don't have the code, point them at
   [open.neis.go.kr](https://open.neis.go.kr) — you cannot reliably guess it.
2. **Timezone and day-boundary hours**, if not Korea/KST: what hour should
   "today" flip to "tomorrow" on the home page (default 16 = 4pm local), and
   until what hour should tonight's dinner still count as "today's" (default
   19 = 7pm local)? Most Korean-school forks can keep the defaults.
3. **Branding**: site name (header/PWA title/OpenGraph), production URL, and
   the class label shown in page titles (e.g. "1학년 3반").
4. **Cloudflare R2 credentials** for file uploads (bucket name, API token,
   access key ID, secret access key, endpoint) — or confirm the user will set
   these themselves via `npx convex env set` (they're secrets; don't ask the
   user to paste them into chat if avoidable, and never write them to a
   tracked file).
5. **Admin PIN** they want to use (4–8 digits) — or confirm they'll set it
   themselves after deploy.
6. Whether they already have a Convex project, or need `pnpm dev:setup` to
   create one (this opens an interactive flow — you may need the user to run
   it themselves if your environment can't handle interactive prompts).

If the user's school isn't served by NEIS (outside Korea, or they want a
different data source), say so plainly: the timetable/meal/schedule fetchers
in `packages/backend/convex/{timetable,meals,schedule}.ts` assume a
NEIS-shaped feed via [timefor.school](https://timefor.school), and swapping
that out is a real code change, not a config edit. Don't attempt that
silently — confirm scope with the user first.

## 2. Where the values live

Everything gathered above (except R2 secrets and Convex project linkage,
which are environment-level, not code) is one file:
**`packages/backend/convex/config.ts`**. Edit constants there — every
consumer already imports from it. Don't reintroduce hardcoded values at call
sites; if you find one config.ts should have covered but doesn't, add it
there rather than inlining it locally.

One exception worth knowing about: `apps/web/svelte.config.js`'s CSP
`connect-src` hardcodes the default `FILES_BASE_URL` host as a literal
string, because that file can't import from the `convex/` TS package. If you
change `FILES_BASE_URL`, update the matching entry there too, or uploaded
file requests will be blocked by the browser's CSP.

Do not touch:
- `packages/backend/convex/schema.ts` — unless the user explicitly wants to
  change the notice categories (수행평가/숙제/준비물/기타), which is a schema
  change, not a config one. Confirm with the user before doing this; it's
  bigger in scope than everything else here.
- Static branding assets (`apps/web/static/*.png`, the favicons/apple-touch
  icons/splash screens) — these are images, not text. Flag them to the user
  rather than trying to auto-generate replacements unless they've supplied
  new assets. `apps/web/src/app.html`'s text content already pulls from
  `config.ts` via a `%site.name%` placeholder filled in by `hooks.server.ts`
  — you shouldn't need to touch either file for a branding-only change.

## 3. Commands, in order

```bash
pnpm install
pnpm dev:setup                 # only if they need a new/linked Convex project — interactive
cp apps/web/.env.example apps/web/.env   # then fill in PUBLIC_CONVEX_URL from packages/backend/.env.local
```

Edit `packages/backend/convex/config.ts` with the gathered values, then:

```bash
pnpm check-types
pnpm test
```

Both must pass before you consider the fork "set up." `check-types` needs
`apps/web/.env` in place (previous step) — without it, `apps/web`'s
type-check fails on a missing `PUBLIC_CONVEX_URL`, which is expected and not
a bug you introduced.

If R2 credentials were provided, set them on the Convex deployment (never in
a tracked file):

```bash
cd packages/backend
npx convex env set R2_BUCKET <value>
npx convex env set R2_TOKEN <value>
npx convex env set R2_ACCESS_KEY_ID <value>
npx convex env set R2_SECRET_ACCESS_KEY <value>
npx convex env set R2_ENDPOINT <value>
```

If a PIN was provided:

```bash
npx convex run settings:setPin '{"newPin":"<value>"}'
```

## 4. Verify before handing back

- `pnpm check-types` and `pnpm test` both pass.
- `packages/backend/convex/config.ts` has no leftover TODO/placeholder values
  the user didn't actually confirm.
- No secret (R2 keys, PIN) was written into a file that isn't gitignored —
  `apps/web/.env` and `packages/backend/.env.local` are, application code and
  `config.ts` are not and must never hold them.
- If you changed `config.ts`, mention that `pnpm dev:server` (or a redeploy)
  needs to restart for cron-schedule changes to take effect.

## 5. Committing

Only commit when the user asks. When you do, keep the config/branding change
separate from any unrelated code changes so it's easy to review as "this is
what makes it *their* class's site."
