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