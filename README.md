# 학급 알림판 (Class Info)

A modern, real-time class notice board built with SvelteKit and Convex —
notices, timetable, meals, and a school calendar in one PWA-friendly site.

This repo is meant to be **forked and re-pointed at your own class**. Almost
everything school-specific (which school, day-rollover hour, branding, admin
PIN, file storage) is a handful of values in one file —
[`packages/backend/convex/config.ts`](packages/backend/convex/config.ts) —
rather than scattered through the code.

Setting this up with an AI coding agent (Claude Code, Cursor, Codex, etc.)?
Point it at **[AGENTS.md](AGENTS.md)** — it has the exact steps and questions
to ask you. Setting it up yourself? Read on, or jump to
**[SETUP.md](SETUP.md)** for the full walkthrough.

## ✨ Features

### 📢 Notice Management
- **Real-time Updates** - Instant synchronization across all devices using Convex
- **Notice Categories** - Organize by type: 수행평가 (Performance Assessment), 숙제 (Homework), 준비물 (Supplies), 기타 (Other)
- **Due Date Tracking** - Automatic sorting and past/current notice separation
- **Smart Grouping** - Notices grouped by date with today/past indicators

### 🗓️ Timetable, Meals & Calendar
- **Live Timetable** - Pulled from your school's NEIS feed, substitutions included
- **Meal Menus** - This week / next week lunch and dinner
- **School Calendar** - Holidays, vacations, and admin-added custom events with D-day countdowns

### 📱 Responsive Design
- **Mobile-First** - Optimized for smartphones and tablets
- **Progressive Text Sizing** - Three breakpoints for optimal readability
- **Installable PWA** - Home-screen icon and splash screens on iOS

### 📝 Rich Content Support
- **Markdown Support** - Full markdown formatting in notice details
- **Media Embedding** - Images and YouTube video embeds
- **File Attachments** - Uploads stored in Cloudflare R2

### 🔒 Admin Features
- **PIN Authentication** - Simple, rate-limited admin access — no user accounts to manage
- **CRUD Operations** - Create, read, update, delete notices, custom events, and the standing timetable

## 🛠️ Technology Stack

- **Frontend**: SvelteKit 5 with TypeScript and Svelte Runes, TailwindCSS v4
- **Backend**: Convex (real-time database and serverless functions)
- **File storage**: Cloudflare R2, via the `@convex-dev/r2` component
- **Data source**: [timefor.school](https://timefor.school) — a public NEIS-backed API for Korean school timetables/meals/calendars
- **Build System**: Turborepo with pnpm workspaces

## Quick Start

```bash
pnpm install
pnpm dev:setup   # creates/connects a Convex project — see SETUP.md
pnpm dev         # starts the web app + Convex dev backend
```

Open [http://localhost:5173](http://localhost:5173).

This gets the app running against **the default demo school** baked into
`config.ts`. Before using it for your own class, follow
**[SETUP.md](SETUP.md)** to point it at your school and set your own admin
PIN, branding, and file storage.

## Project Structure

```
class-info/
├── apps/
│   └── web/            # Frontend application (SvelteKit)
└── packages/
    └── backend/         # Convex backend functions and schema
        └── convex/
            ├── config.ts    # ← the values a fork changes (start here)
            ├── schema.ts    # database schema
            └── *.ts         # queries, mutations, actions
```

## Available Scripts

- `pnpm dev`: Start all applications in development mode
- `pnpm build`: Build all applications
- `pnpm dev:web`: Start only the web application
- `pnpm dev:server`: Start only the Convex backend
- `pnpm dev:setup`: Set up and configure your Convex project (first-time only)
- `pnpm check-types`: Type-check all apps
- `pnpm test`: Run the backend test suite

See [CLAUDE.md](CLAUDE.md) for more on the codebase's architecture and
conventions, and [SETUP.md](SETUP.md) for forking this for your own class.

## License

No license file is included — ask the repo owner before reusing this beyond
forking it for your own class's private use.
