# Ema TnE - Project Rules

> Updated at: 2026-02-28 19:45 IST

## Project Overview
Two parallel tracks:

### Track 1: TnE Tool (primary)
Time and Expense Management application — the main codebase we're building.

### Track 2: AI Code Review Evaluation (secondary)
Evaluating CodeRabbit and Greptile as AI code review tools. Using this repo's PRs as the test surface. Analysis covers:
- Onboarding: friction, clarity, time-to-value
- Core features: value, usability gaps, differentiation
- ICP, core problem solved, churn risks
- Side-by-side comparison on the same PRs

## Tech Stack
- **Framework:** Next.js 16 (App Router, Turbopack)
- **Language:** TypeScript (strict mode)
- **Styling:** Tailwind CSS v4 + shadcn/ui
- **Database:** Supabase (Postgres)
- **Auth:** Supabase Auth (via `@supabase/ssr`)
- **API:** tRPC v11 (with superjson transformer)
- **State:** Zustand
- **Validation:** Zod + React Hook Form
- **Package Manager:** npm

## Directory Structure
```
src/
  app/              # Next.js App Router pages and layouts
    api/trpc/       # tRPC API route handler
  lib/
    supabase/       # Supabase client (browser), server, middleware helpers
    trpc/           # tRPC client, server caller, and React provider
    utils.ts        # shadcn/ui utility (cn function)
  server/
    trpc/           # tRPC initialization (router, procedures)
    routers/        # tRPC route definitions
  components/
    ui/             # shadcn/ui components (auto-generated)
```

## Conventions
- Import alias: `@/*` maps to `./src/*`
- Use `createClient()` from `@/lib/supabase/server` in Server Components
- Use `createClient()` from `@/lib/supabase/client` in Client Components
- Add new tRPC routers in `src/server/routers/` and register them in `_app.ts`
- Use `publicProcedure` for unauthenticated endpoints
- shadcn/ui components go in `src/components/ui/` (managed by `npx shadcn add`)

## Workflow
- Workflow enforcement is enabled (`.workflow-enforced`)
- All work on feature branches, never commit directly to `main` or `develop`
- Conventional commits required

## Agent Rules
> Updated at: 2026-03-01 17:20 IST
- **NEVER use GSD agents** (gsd-executor, gsd-planner, gsd-verifier, gsd-debugger, gsd-codebase-mapper, gsd-roadmapper, etc.) — they inject GSD-specific protocols and context that add unnecessary overhead
- Use `general-purpose` for code writing, multi-step tasks, and research (it has all tools)
- Use `Explore` for quick codebase exploration (read-only)
- Use `haiku` model for simple/fast agent tasks to minimize cost
