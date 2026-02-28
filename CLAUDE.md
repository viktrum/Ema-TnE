# Ema TnE - Project Rules

> Updated at: 2026-02-28 19:22 IST

## Project Overview
Time and Expense Management application.

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
