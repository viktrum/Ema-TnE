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

### CodeRabbit CLI Review

**Method:** `coderabbit review --plain` (ran locally on working tree changes)
**Time to review:** ~30 seconds

**Issues found:** 3
1. HTTP/HTTPS protocol mismatch in `supabase/config.toml` (site_url vs additional_redirect_urls)
2. Missing CSS design tokens (`--ema-red-light`, `--ema-blue-light`) referenced in spec but not defined
3. Type inconsistency: `featuredId` is `number` in store but `string` in spec

**Quality:** MEDIUM — found valid but lower-severity issues. The missing CSS tokens and type mismatch are useful catches. Did NOT find the critical schema mismatches that the internal review caught.

### CodeRabbit GitHub App Review

**Status:** NOT INSTALLED — GitHub App needs to be installed on viktrum/Ema-TnE

### Greptile GitHub App Review

**Status:** NOT INSTALLED — GitHub App needs to be installed on viktrum/Ema-TnE

---

## Evaluation Summary Table

| Metric | Internal (Claude Code) | CodeRabbit CLI | CodeRabbit App | Greptile App |
|---|---|---|---|---|
| Time to first review | ~2 min | ~30 sec | N/A | N/A |
| Total comments | 13 | 3 | — | — |
| Quality (1-5) | 5 | 3 | — | — |
| False positives | 1-2 | 0 | — | — |
| Critical bugs caught | 6 | 0 | — | — |
| Security issues flagged | 2 | 0 | — | — |
| Actionable suggestions | 9 | 3 | — | — |
| Noise / unhelpful | 2 | 0 | — | — |

### Observations

- Internal review caught ALL the critical schema/column mismatches — these would have been runtime failures on every DB operation
- CodeRabbit CLI is faster but shallower — good for catching CSS/config issues but missed the core bugs
- CodeRabbit CLI reviews local working tree changes, not PR diffs specifically
- Both tools complement each other: internal for depth, CodeRabbit for breadth/speed
- GitHub App versions (both CodeRabbit and Greptile) still need to be installed for PR-level reviews
