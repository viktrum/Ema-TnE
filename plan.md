# Ema TnE — Execution Plan Log

> Append-only. Newest at bottom. Never overwrite entries.

---

## 2026-03-01 17:00 IST — Full Build Plan
**Branch:** develop
**Status:** In Progress
**Summary:** 6-phase T&E AI Employee prototype build. Target: Gate 6 (all phases), Fallback: Gate 4 minimum.

Phases:
1. Foundation (schema, auth, LLM, tRPC)
2. Chat UI (streaming, expense table, reasoning)
3. Dashboard (3-panel, approvals, realtime)
4. Depth (edit flows, scenario selector)
5. Polish (splash, loading steps, London)
6. Evals (AI tests, rehearsal, deploy)

---

## 2026-03-01 18:30 IST — Phase 1 Completed
**Branch:** feature/phase-1-foundation → merged to develop
**PR:** #1 (https://github.com/viktrum/Ema-TnE/pull/1)
**Gate 1:** PARTIAL — build passes, types check, schema + seed created. Full gate tests pending (need running Supabase).
**Key deliverables:** 10 Supabase tables, 4 auth users, 3 scenarios, LLM client + prompts, tRPC routers, chat SSE, login page.
**Code review:** Internal found 6 critical schema mismatches (fixed). CodeRabbit CLI found 3 surface issues.

---

## 2026-03-01 19:15 IST — Phase 2 In Progress
**Branch:** feature/phase-2-chat-ui
**PR:** #2 (https://github.com/viktrum/Ema-TnE/pull/2)
**Status:** Components built, multiple fixes applied. Running UAT Gate 2 checks.
**Key deliverables:** Chat sidebar, message bubbles, expense table, confidence badges, source icons, reasoning panel (dinner pre-expanded), Zustand stores, chat page with SSE streaming.
**Bugs found & fixed:**
- ConfidenceBadge assumed 0-1 scale (spec uses 0-100)
- Fallback data shape didn't match AssemblyOutputSchema (flat vs nested)
- Reasoning showed [object Object] — now built as strings from structured fields
- Duplicate reasoning blocks (flagged + re-categorized) — consolidated to single block
- Duplicate Vendor column removed, proper policy_status matching

**P2 — Data-as-Config (Future):**
- Drop a new JSON file → engine processes it → new scenario works without code changes
- Scenario files in `scenarios/` directory with traveler, transactions, context
- No pre-computed categories/reasoning — AI generates everything
- Enables: custom demos, new clients, live data feeds

---

## 2026-03-01 21:45 IST — Phase 2 Completed
**Branch:** feature/phase-2-chat-ui → merging to develop
**PR:** #2 (https://github.com/viktrum/Ema-TnE/pull/2)
**Gate 2:** PASS (automated: 8/8, manual: 5/5 confirmed by user)
**Key deliverables:** Chat UI, hybrid assembly engine (deterministic + parallel AI), expense table, reasoning panels, Zustand stores, per-item Haiku categorization, constrained prompts
**Commits:** 14 (feat + fixes for fallback transform, confidence scale, dynamic panels, constrained prompts, re-categorization logic)
**Code review:** Internal found confidence scale bug + schema mismatches. CodeRabbit CLI found 2 issues.
**Learnings:** Seed data shape ≠ Zod schema shape (must verify). AI re-categorizes everything unless constrained. Parallel Haiku calls ~2s vs monolithic prompt 20-30s.

**Deferred to Phase 5 (Polish):**
- Chat message UI/UX redesign — current messages are functional but not polished
- Use `frontend-design` skill for pixel-perfect chat bubble layout
- Better visual hierarchy: message → table → reasoning → gap question
- Streaming animation, typing indicator refinement
- Mobile responsiveness
