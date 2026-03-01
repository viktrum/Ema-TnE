# Code Review Tool Evaluation

## PR #1: feat(phase-1): foundation — schema, auth, LLM client, tRPC core

**PR URL:** https://github.com/viktrum/Ema-TnE/pull/1
**Files changed:** 33 | **Additions:** 3,797 | **Deletions:** 19

### Internal Code Review (Claude Code `code-review:code-review` skill)

**Method:** 5 parallel review agents (CLAUDE.md compliance, shallow bug scan, git history, previous PRs, code comments)
**Time to review:** ~2 minutes (all 5 agents ran in parallel)

**Issues found:** 13 total across all agents
**Critical issues (actually fixed):**
1. Schema mismatch: `reports` table insert used non-existent columns (`data`, `fallback_used`)
2. `audit_log` insert used wrong column names (`action`, `entity_type`, `entity_id` vs `event_type`, `details`)
3. `ai_metrics` insert used `operation` instead of `prompt_type`, passed null to NOT NULL column
4. `scenario.data` / `policy.data` field access — columns don't exist in DB
5. `structured-output.ts` no try/catch on JSON.parse — crashes on bad LLM output
6. Dead `isLLMAvailable()` OpenAI branch that would return true but `getProvider()` would throw
7. Regex typo in fallback matching (`[0o]` matching letter "o")
8. Missing input validation on `/api/chat` POST body
9. `handleFallback` typed as `any` instead of `SupabaseClient`

**Lower severity (noted, not all fixed):**
- Hardcoded demo password in login page (acceptable for demo prototype)
- `/api` broadly whitelisted in middleware (chat route has its own auth)
- `next-themes` dependency without ThemeProvider (shadcn auto-added it)
- Missing EOF newline in globals.css

**Quality:** HIGH — found real bugs that would have caused runtime failures. The schema mismatch issues (1-4) were the most critical — every DB write would have failed.

### CodeRabbit CLI Review (PR #1)

**Method:** `coderabbit review --plain` (ran locally on working tree changes)
**Time to review:** ~30 seconds

**Issues found:** 3
1. HTTP/HTTPS protocol mismatch in `supabase/config.toml` (site_url vs additional_redirect_urls)
2. Missing CSS design tokens (`--ema-red-light`, `--ema-blue-light`) referenced in spec but not defined
3. Type inconsistency: `featuredId` is `number` in store but `string` in spec

**Quality:** MEDIUM — found valid but lower-severity issues. Did NOT find the critical schema mismatches.

### CodeRabbit GitHub App Review (PR #1)

**Status:** PENDING INSTALLATION — Install at https://github.com/marketplace/coderabbitai

### Greptile GitHub App Review (PR #1)

**Status:** PENDING INSTALLATION — Install at https://github.com/apps/greptile-apps

---

## PR #2: feat(phase-2): chat UI — streaming, expense table, reasoning panel

**PR URL:** https://github.com/viktrum/Ema-TnE/pull/2
**Files changed:** 15 | **Additions:** 2,011

### Internal Code Review (Claude Code `code-review:code-review` skill)

**Status:** PENDING — to be run

### CodeRabbit CLI Review (PR #2)

**Method:** `coderabbit review --plain` (ran locally)
**Time to review:** ~2 minutes
**Total findings reported:** 26 (includes carryover from PR #1 files)

**New issues specific to Phase 2:**
1. Chat route `onError` handler doesn't persist error state to `ai_metrics` — makes debugging production issues difficult
2. Postgres version mismatch warning — `supabase/config.toml` sets v17 but remote may differ

**Quality:** LOW-MEDIUM for Phase 2 specifically — the 26 findings include many carryover items from Phase 1 files. Only 2 new findings for the Phase 2 code. The error logging suggestion is valid but not critical for a demo.

### CodeRabbit GitHub App Review (PR #2)

**Status:** PENDING INSTALLATION

### Greptile GitHub App Review (PR #2)

**Status:** PENDING INSTALLATION

---

## Cumulative Evaluation Summary

| Metric | Internal (Claude Code) | CodeRabbit CLI | CodeRabbit App | Greptile App |
|---|---|---|---|---|
| **PR #1** | | | | |
| Time to first review | ~2 min | ~30 sec | PENDING | PENDING |
| Total comments | 13 | 3 | — | — |
| Quality (1-5) | 5 | 3 | — | — |
| False positives | 1-2 | 0 | — | — |
| Critical bugs caught | 6 | 0 | — | — |
| Security issues flagged | 2 | 0 | — | — |
| Actionable suggestions | 9 | 3 | — | — |
| Noise / unhelpful | 2 | 0 | — | — |
| **PR #2** | | | | |
| Time to first review | PENDING | ~2 min | PENDING | PENDING |
| Total comments | — | 2 (new) | — | — |
| Quality (1-5) | — | 2 | — | — |
| False positives | — | 0 | — | — |
| Critical bugs caught | — | 0 | — | — |
| Security issues flagged | — | 0 | — | — |
| Actionable suggestions | — | 1 | — | — |
| Noise / unhelpful | — | 24 (carryover) | — | — |

---

## PR #3: feat(phase-3): dashboard — 3-panel layout, approvals, realtime sync

**PR URL:** https://github.com/viktrum/Ema-TnE/pull/3
**Files changed:** 10 | **Additions:** 1,088

### Internal Code Review (direct review)

**Method:** Direct file review of dashboard page + components
**Time:** ~5 min

**Issues found:** 3
1. **CRITICAL:** Dashboard role check used `user.user_metadata?.role` which is empty for dashboard-created users — would redirect all managers to /chat. Fixed with public.users DB lookup.
2. **MEDIUM:** `supabase` client created outside useEffect — new client on every render.
3. **LOW:** StatsPanel `Stat.value` typed as `string` but store has `string | number`. Fixed.

### CodeRabbit CLI Review (PR #3)

**Method:** `coderabbit review --plain`
**Issues found:** 1 (contrast ratio inaccuracy in comments — cosmetic)
**Quality:** LOW — only found a comment accuracy issue, missed the critical role check bug.

### Gate 3 UAT Results

| Test | Status |
|---|---|
| G3-01: Dashboard loads | PASS |
| G3-02: "4 hours" North Star | PASS |
| G3-03: 38 auto-approved | PASS (verified: 38) |
| G3-04: 9 flagged items | PASS (verified: 9) |
| G3-05: Tanya's dinner featured | PASS |
| G3-06: Approve button | MANUAL |
| G3-07: Reject modal | MANUAL |
| G3-08: Ask Employee modal | MANUAL |
| G3-09: CHRO health stats | PASS |
| G3-10: Navigation | MANUAL |

### Observations So Far

- **Internal review (Claude Code skill)** caught ALL critical schema/column mismatches in PR #1 — these would have been runtime failures. Highest value per review.
- **CodeRabbit CLI** is fast (~30s-2min) and good for CSS/config/surface-level issues. Weak at cross-file schema validation. Carries over old findings which adds noise.
- **GitHub Apps** (both CodeRabbit and Greptile) not yet installed — need to install to compare PR-level automated reviews.
- **Complementary pattern emerging**: Internal for depth + correctness, CodeRabbit CLI for speed + surface issues.

### Setup Status

| Tool | Status | Install Link |
|---|---|---|
| Claude Code `code-review:code-review` | ✅ Installed & working | Built-in skill |
| CodeRabbit CLI | ✅ Installed & working | `curl -fsSL https://cli.coderabbit.ai/install.sh \| sh` |
| CodeRabbit GitHub App | ❌ Not installed | https://github.com/marketplace/coderabbitai |
| Greptile GitHub App | ❌ Not installed | https://github.com/apps/greptile-apps |
