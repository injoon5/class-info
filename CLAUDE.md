# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Architecture

This is a TypeScript monorepo built with Turborepo, featuring a SvelteKit frontend and Convex backend-as-a-service. The project structure is:

```
class-info/
├── apps/
│   └── web/           # SvelteKit frontend application
└── packages/
    └── backend/       # Convex backend functions and schema
```

### Tech Stack
- **Frontend**: SvelteKit with TypeScript, TailwindCSS v4, shadcn/ui components
- **Backend**: Convex (real-time database and backend functions)
- **Build System**: Turborepo with pnpm workspaces
- **Package Manager**: pnpm (v8.8.0)

## Essential Commands

### Development
```bash
# Install dependencies
pnpm install

# First-time setup (configures Convex project)
pnpm dev:setup

# Start all services in development
pnpm dev

# Start individual services
pnpm dev:web      # Frontend only (port 5173)
pnpm dev:server   # Convex backend only
```

### Build & Type Checking
```bash
# Build all applications
pnpm build

# Type check all applications
pnpm check-types

# Type check web app specifically
cd apps/web && pnpm check
```

Type checking the web app reads `PUBLIC_CONVEX_URL` from the environment, so
copy `apps/web/.env.example` to `.env` first (any URL-shaped value will do —
the checks make no network calls).

### Tests

```bash
# Run every suite
pnpm test

# Backend only, in watch mode
cd packages/backend && pnpm test:watch
```

Tests live beside the code as `convex/*.test.ts` — Convex skips any filename
with more than one dot, so they are never pushed as functions. Vitest runs them
in the `edge-runtime` environment, and `convex-test` executes real queries
against an in-memory database, so `schedule.test.ts` exercises the same index
reads and validators as production. Pure calendar logic is covered directly in
`dates.test.ts`.

Both commands run in CI on every pull request (`.github/workflows/ci.yml`).

## Convex Backend

The backend uses Convex for real-time data and serverless functions. Key files:
- `packages/backend/convex/schema.ts` - Database schema definitions
- `packages/backend/convex/*.ts` - Backend functions (queries, mutations, actions)
- `packages/backend/convex/_generated/` - Auto-generated types and API

Convex functions are automatically deployed when running `pnpm dev` or `pnpm dev:server`.

## Frontend Structure

The SvelteKit app uses:
- Svelte 5 with runes
- TailwindCSS v4 (configured via Vite plugin)
- TypeScript with strict type checking
- Convex client integration via `convex-svelte`

## Key Configuration

- Turborepo tasks defined in `turbo.json`
- Web app build/dev configured in `apps/web/vite.config.ts`
- Convex backend configured automatically via CLI setup
- TypeScript configs per workspace with shared settings