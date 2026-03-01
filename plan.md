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

**P2 — Role-Based Dashboard Views (Future):**
- Mihir (manager): inbox view — done now ✅
- Chitra (CHRO): org-wide dashboard — hero metric "4 hours", 81% auto-approved, compliance trends, flag type distribution
- Admin: full system view — all reports, metrics, audit trail
- Switch view based on user role from public.users table

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

---

## 2026-03-01 22:15 IST — Phase 3 Ready (Pending Merge)
**Branch:** feature/phase-3-dashboard
**PR:** #3 (https://github.com/viktrum/Ema-TnE/pull/3)
**Gate 3:** PASS (automated: 6/10, manual: 4 pending)
**Key deliverables:** Dashboard 3-panel layout, NorthStarBanner ("4 hours"), ReportList (38 auto-approved), FlaggedPanel (9 flagged with actions), StatsPanel (CHRO metrics), tRPC routers (dashboard + approval), Supabase Realtime subscriptions, reject/ask modals
**Code review:** Internal found critical role check bug (fixed). CodeRabbit CLI found 1 cosmetic issue.
**Status:** NOT MERGED — waiting for Phase 2 deep research results before merging

---

## 2026-03-01 22:45 IST — Phase 3 Dashboard Redesigned
**Branch:** feature/phase-3-dashboard
**PR:** #3 (https://github.com/viktrum/Ema-TnE/pull/3)
**Change:** Replaced 3-panel dashboard with manager inbox view. "4 hours" hero metric moved to future CHRO view. Manager sees: compact stats bar + flagged items inbox with expand/collapse + action buttons.
**Status:** NOT MERGED — waiting for: (1) deep research results, (2) manual testing, (3) possible further changes

---

## 2026-03-02 00:30 IST — Phase 3 Merged + Code Review Fixes
**Branch:** feature/phase-3-dashboard → merged to develop
**PR:** #3 (https://github.com/viktrum/Ema-TnE/pull/3)
**Gate 3:** PASS — build passes, tsc clean, code review fixes applied
**Code review findings (3 issues fixed):**
1. `reject` mutation missing `dashboard_reports.status` update → added (sets 'rejected')
2. FK mismatch: `approvals.report_id` referenced `reports(id)` but used with `dashboard_reports.id` → dropped FK
3. Supabase query builder `.eq()` return value discarded → fixed with reassignment
**Migration 002:** Dropped FKs on `approvals` + `audit_log`, expanded `dashboard_reports.status` CHECK to include 'rejected', 'pending_info'
**Decision:** Deep research results deferred to Phase 5/6 (ship working prototype first)

---

## 2026-03-02 01:00 IST — Phase 3.5 Planned: Bidirectional Realtime
**Branch:** feature/phase-3.5-realtime (not started)
**Status:** Plan approved, ready for implementation
**Purpose:** Connect Tanya's chat ↔ Mihir's dashboard for side-by-side demo

### Approach: scenario_id link + chat_messages realtime (D+C simplified)
- **Flow 1 (Tanya→Mihir):** `report.submit` INSERTs into `dashboard_reports` using `scenario_id` (already exists). Dashboard subscribes to `postgres_changes` on `dashboard_reports`.
- **Flow 2 (Mihir→Tanya):** Approval router INSERTs into `chat_messages` as Ema message. Chat page subscribes to `postgres_changes` on `chat_messages` filtered by `user_id`. Message appears in real-time AND persists on refresh.

### Tasks
1. Migration `003_realtime_bridge.sql`: Add `dashboard_reports` + `chat_messages` to realtime publication, add INSERT RLS policies
2. `report.ts`: Submit mutation → INSERT `dashboard_reports` with data-driven mapper (works for Mumbai, Bangalore, London)
3. `approval.ts`: Each mutation → INSERT `chat_messages` as Ema notification message
4. `dashboard/page.tsx`: Switch realtime channel from `reports` to `dashboard_reports`
5. `chat/page.tsx`: Add `chat_messages` realtime subscription with dedup logic

### Gate 3.5 UATs (8 tests)
- G3.5-01: Submit creates dashboard entry
- G3.5-02: Dashboard receives in real-time (CRITICAL)
- G3.5-03: Approve notification in chat (CRITICAL)
- G3.5-04: Reject with reason in chat
- G3.5-05: Ask Employee question in chat
- G3.5-06: Notification persists on refresh
- G3.5-07: No duplicate messages (dedup)
- G3.5-08: Dashboard counts update after approval

### Key Research Findings
- Supabase Realtime respects RLS — events silently dropped if no SELECT policy
- Publication changes are immediate on Cloud (no restart)
- Server-side broadcast requires `realtime.send()` Postgres function — using `postgres_changes` on `chat_messages` instead (simpler)
- `worker: true` on Supabase client prevents silent disconnections in background tabs
- Phase 4 impact: mapper must be data-driven, not Mumbai-hardcoded

### Files (~85 lines new code)
- `supabase/migrations/003_realtime_bridge.sql` (NEW)
- `src/server/routers/report.ts` (MODIFY)
- `src/server/routers/approval.ts` (MODIFY)
- `src/app/dashboard/page.tsx` (MODIFY)
- `src/app/chat/page.tsx` (MODIFY)

---

## Current State (End of Session 2)
- Phase 1: ✅ Merged to develop (PR #1)
- Phase 2: ✅ Merged to develop (PR #2)
- Phase 3: ✅ Merged to develop (PR #3) — code review fixes included
- Phase 3.5: 📋 Planned — bidirectional realtime, ready for implementation
- Phase 4-6: Not started
- Deep research: Results available, deferred to Phase 5/6
- CodeRabbit/Greptile GitHub Apps: NOT installed

**Deferred to Phase 5 (Polish):**
- Chat message UI/UX redesign — current messages are functional but not polished
- Use `frontend-design` skill for pixel-perfect chat bubble layout
- Better visual hierarchy: message → table → reasoning → gap question
- Streaming animation, typing indicator refinement
- Mobile responsiveness
