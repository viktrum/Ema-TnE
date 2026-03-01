# Ema TnE - Project Rules

> Updated at: 2026-03-01 22:45 IST

## Session Continuity
To restore context from a previous session, read these files in order:
1. `plan.md` — Current state, all decisions, and priority task list
2. `SESSION-SUMMARY.md` — Chronological log of all sessions with what happened and what's next
3. `~/.claude/projects/-Users-piyushmayank-Projects-Ema-TnE/memory/MEMORY.md` — Persistent memory

## MANDATORY: Post-Phase Checklist (DO NOT SKIP)
> Updated at: 2026-03-01 19:35 IST

After completing EVERY phase, you MUST run through this checklist IN ORDER before starting the next phase. Cross-reference with the original execution plan to verify nothing was missed.

### Code Quality
- [ ] `npx tsc --noEmit` — clean TypeScript compilation
- [ ] `npm run build` — successful production build
- [ ] Run gate tests for the phase (check spec/UAT.md for exact tests)

### Code Review (ALL THREE)
- [ ] Run `code-review:code-review` skill on the PR (5 parallel agents)
- [ ] Run `coderabbit review --plain` locally
- [ ] Fix any critical issues found
- [ ] Save ALL findings to `docs/code-review-evaluation.md`

### Git Workflow
- [ ] Commit with conventional format: `feat(phase-N): description`
- [ ] Push to feature branch
- [ ] Create PR with `gh pr create --base develop`
- [ ] Post code review comment on PR with `gh pr comment`
- [ ] Update `docs/git-commands-log.md` with any new git commands used

### Knowledge Files
- [ ] Update `plan.md` — append phase completion status + gate result
- [ ] Update `memory.md` — add phase learnings, gotchas, code review observations
- [ ] Update `CLAUDE.md` — ONLY if directory structure or architecture changed
- [ ] Update `docs/code-review-evaluation.md` — add PR data for this phase

### Context Management
- [ ] If conversation is getting long (50+ exchanges): run `/handover` and start fresh session
- [ ] If heavy agent output consumed context: checkpoint by committing + updating memory

### Verify Against Original Plan
- [ ] Re-read the phase section in the execution plan
- [ ] Confirm all sub-tasks listed are completed
- [ ] Confirm all files listed in the plan exist
- [ ] Confirm gate checkpoint criteria are met

---

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
> Updated at: 2026-03-01 19:30 IST
```
src/
  app/              # Next.js App Router pages and layouts
    api/trpc/       # tRPC API route handler
    api/chat/       # SSE streaming endpoint (plain Route Handler, not tRPC — SSE requires it)
    login/          # Click-to-login page (4 user cards)
    chat/           # Employee chat screen
    dashboard/      # Admin dashboard (Phase 3)
  lib/
    supabase/       # Supabase client (browser), server, middleware helpers
    trpc/           # tRPC client, server caller, and React provider
    llm/            # LLM client wrapper, Claude provider, prompts
    engine/         # Deterministic assembly engine (assembler, types)
    utils.ts        # shadcn/ui utility (cn function)
  server/
    trpc/           # tRPC initialization (router, procedures, context with auth)
    routers/        # tRPC route definitions (health, scenario, report, dashboard, approval)
    schemas/        # Zod schemas shared between tRPC and LLM (assembly, chat, categorize)
  stores/           # Zustand stores (auth, chat, dashboard)
  components/
    ui/             # shadcn/ui components (auto-generated)
    chat/           # Chat-specific components (Sidebar, MessageBubble, ChatInput, TypingIndicator)
    shared/         # Shared components (ExpenseTable, ConfidenceBadge, SourceIcons, ReasoningPanel)
    dashboard/      # Dashboard components (Phase 3)
supabase/
  migrations/       # SQL migration files
  seed.sql          # Seed data (users, scenarios, policies, dashboard reports, fallbacks)
docs/               # Code review evaluation, git commands log
```

## Conventions
> Updated at: 2026-03-02 01:30 IST
- Import alias: `@/*` maps to `./src/*`
- Use `createClient()` from `@/lib/supabase/server` in Server Components
- Use `createClient()` from `@/lib/supabase/client` in Client Components
- Add new tRPC routers in `src/server/routers/` and register them in `_app.ts`
- Use `publicProcedure` for unauthenticated endpoints
- shadcn/ui components go in `src/components/ui/` (managed by `npx shadcn add`)

## Realtime Patterns
> Updated at: 2026-03-02 01:30 IST
- **Cross-user notifications:** INSERT into target table (e.g. `chat_messages`) → client subscribes to `postgres_changes` → message appears in real-time. Do NOT use JS client `channel.send()` from server-side code.
- **Realtime publication:** Tables must be in `supabase_realtime` publication. Currently: `reports`, `approvals`, `dashboard_reports`, `chat_messages`.
- **RLS + Realtime:** Events are silently dropped if the subscriber can't SELECT the row. Always verify SELECT policy exists.
- **Dedup on chat page:** Chat messages created via SSE streaming are added to Zustand locally AND INSERTed to `chat_messages` server-side. The realtime subscription fires for those INSERTs — must skip messages already in Zustand to avoid duplicates.
- **`reports` ↔ `dashboard_reports` link:** Uses `scenario_id` (exists on both tables). No bridge column. `approvals.report_id` is TEXT (no FK) — shared by chat flow (text IDs) and dashboard flow (stringified SERIAL IDs).

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
