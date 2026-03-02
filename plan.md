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

## 2026-03-02 02:00 IST — Phase 3.5 Completed
**Branch:** feature/phase-3.5-realtime → merged to develop
**PR:** #4 (https://github.com/viktrum/Ema-TnE/pull/4)
**Gate 3.5:** PASS — side-by-side demo works (Tanya submits → Mihir sees in 2s → approves → Tanya gets Ema message)
**Code review findings (4 issues fixed at threshold 75):**
1. Fragile dedup (85): replaced content-sniffing with `message_type` column
2. Hardcoded "Mihir" (75): dynamic reviewer name lookup
3. XSS (75): `escapeHtml()` for user input in notification HTML
4. Silent errors (75): error logging + typed `SupabaseClient`
**Bugs fixed during testing:**
- LLM JSON wrapped in markdown fences — added fence stripping + latch-based detection
- Realtime dedup — SSE-streamed messages duplicated by subscription → `message_type` discriminator
- Chat input disabled after submit → enabled for post-submit replies
**Known polish (Phase 5):** Dashboard submitted report display quality (severity inverted, raw sources, no reasoning text)

---

## 2026-03-02 02:45 IST — Phase 3.8 Planned: Pre-Demo Hardening
**Branch:** feature/phase-3.8-hardening (not started)
**Status:** Plan approved, ready for implementation
**Purpose:** Harden chat against garbage input, fix XSS, enrich demo narrative, add prompt evals

### 8 Priorities (~112 min total)
1. **System prompt hardening** — scope boundary, injection protection, submission gate, sequential gap handling, add-item gate
2. **XSS fix** — `isomorphic-dompurify` in MessageBubble.tsx (NOT `dompurify` — SSR crash)
3. **Fence-stripping consolidation** — shared `parseLLMResponse.ts` utility replacing 3 inline regexes
4. **Seed data enrichment** — 3 new flagged dashboard_reports: cross-employee duplicate (Rank 6), phantom client dinner (Rank 2), conference meal overlap (Rank 5)
5. **Demo script update** — Step 6 narration for new flagged items (escalating intensity through dashboard)
5b. **Fallback fix** — universal fallback shows submit button prematurely → set to false
6. **Action handler completion** — wire up add_item, update_category, remove_item in parseAndApplyActions
7. **Input hardening** — maxLength=500 on ChatInput, server-side 2000 char guard
8. **scenarioContext fix** — fetch scenario server-side in route.ts, pass to buildChatMessages

### 7 Prompt Evals (run 3x each, 2/3 pass threshold)
E1: Scope boundary (weather question → redirect)
E2: Garbage input (random chars → redirect)
E3: Prompt injection (ignore instructions → redirect)
E4: Submission gate (early submit → blocks)
E5: Sequential gaps (gap 1 resolved → asks gap 2)
E6: Echo prevention (script tag → not echoed)
E7: Add item (chai at airport → asks for details or adds)

### Scoping Decisions
- Per-item progressive submission: NOT building (control by narration)
- Carousel for multi-flag items: NOT building
- Re-approval after edits: NOT building
- Chat history persistence: NOT building (fresh demo each time)

### Research Sources
- Deep research synthesis: `docs/Expense Assembly research/SYNTHESIS — Expense Assembly Problem Discovery.md`
- 3 deep research agents (chat UX gaps, demo narrative, garbage handling)
- 1 principal architect review (4 corrections, 2 additions)

---

## Current State (End of Session 4)
- Phase 1: ✅ Merged (PR #1)
- Phase 2: ✅ Merged (PR #2)
- Phase 3: ✅ Merged (PR #3)
- Phase 3.5: ✅ Merged (PR #4)
- Phase 3.8: ✅ Merged (PR #5 + hotfix #6 + docs #7)
- Phase 4: ✅ Merged (PR #8) — scenario selector, edit flows, expandable reasoning
- Phase 5: ✅ Merged (PR #9) — splash, markdown, progress steps, mapper fix, visual polish
- Phase 6: ✅ Merged (PR #10) — evals + pre-demo checklist
- Phase 7: 🔄 In progress — dashboard 10-star redesign
- CodeRabbit/Greptile GitHub Apps: NOT installed

**Deferred to Phase 5 (Polish):**
- Chat message UI/UX redesign — current messages are functional but not polished
- Use `frontend-design` skill for pixel-perfect chat bubble layout
- Better visual hierarchy: message → table → reasoning → gap question
- Streaming animation, typing indicator refinement
- Mobile responsiveness
- **Markdown-to-HTML in chat messages** — LLM sometimes returns markdown pipe tables (`| Col | Val |`) in the `response` field. `MessageBubble` uses `dangerouslySetInnerHTML` which renders HTML but not markdown. Tables show as raw text. Fix: add `marked` or `react-markdown` renderer, or instruct LLM to return HTML tables. Non-deterministic — happens on some runs, not others.
- **Dashboard submitted report polish** — reports submitted via chat→dashboard bridge show raw assembly data instead of clean dashboard format:
  - Severity logic inverted (high confidence → LOW, should use flag type not confidence)
  - Flag reason is raw assembly text, needs human-readable formatting
  - Sources show raw identifiers ("Email (PNR: ABC123)"), need clean labels ("Calendar", "CRM", "Policy")
  - Reasoning section shows badges but no explanation text

---

## 2026-03-02 05:00 IST — Phase 3.8 Completed
**Branch:** feature/phase-3.8-hardening → merged to develop
**PR:** #5 (https://github.com/viktrum/Ema-TnE/pull/5)
**Hotfix:** #6 (https://github.com/viktrum/Ema-TnE/pull/6) — NaN fix for update_amount
**Gate 3.8:** PASS — 7/7 promptfoo evals, 10/10 UATs, tsc clean, build passes
**Key deliverables:**
- System prompt hardened (5 sections: scope boundary, injection protection, submission gate, add-item gate, sequential gaps)
- XSS fixed via isomorphic-dompurify in MessageBubble
- Fence-stripping consolidated into shared parseLLMResponse.ts utility
- 3 new flagged dashboard reports (cross-employee duplicate, phantom client dinner, conference meal overlap)
- Demo script Step 6 updated with escalating narrative arc
- Action handlers wired (add_item, update_category, remove_item)
- Input hardening (maxLength=500 + counter, server-side 2000 char guard)
- scenarioContext fetched server-side from Supabase
- Promptfoo eval suite added (7 tests, 100% pass rate)
**Code review findings (3 issues fixed at threshold 75):**
1. Universal fallback message was scenario-specific ("taxi fare") — made neutral
2. extractChatResponse save logic had unreachable fallback — fixed with parsed check
3. CLAUDE.md directory structure not updated for utils/ and evals/ — updated
**Bug found during UAT:** update_amount NaN when LLM sends currency symbols (PR #6)
**Deferred:** Markdown tables in chat (LLM returns pipe tables, MessageBubble only renders HTML)

---

## 2026-03-02 19:45 IST — Phase 6 Completed (Stage 1)
**Branch:** feature/phase-6-evals → merged to develop
**PR:** #10 (https://github.com/viktrum/Ema-TnE/pull/10)
**Gate 6:** PASS — 12/12 promptfoo evals, pre-demo checklist passes
**Key deliverables:** 5 new eval tests (E8-E12), pre-demo-check.js script, npm run evals shortcut
**Status:** Stage 2 (demo rehearsal) deferred — moving to dashboard redesign

---

## 2026-03-02 20:00 IST — Phase 7 Planned: Dashboard 10-Star Redesign
**Branch:** feature/phase-7-dashboard-redesign (not started)
**Status:** Plan approved, ready for implementation
**Purpose:** Transform flat SaaS inbox into AI-native manager approval experience

### Architecture: Two Views, One Toggle
- **Manager view (default):** Ema briefing bar + three-tier grouped inbox (Needs Your Call / Quick Review / Auto-Handled)
- **Admin view (toggle):** Hero banner ("4 hours") + health stats + flag distribution + read-only flags

### Key Design Decisions
1. Tier classification: severity + confidence → decision/review/auto-handled (computed at render, not stored)
2. AI recommendations: deterministic regex from flag_reason → approve/reject/ask (no LLM call)
3. Source cards: visual icon+finding cards replacing text pills (imports SOURCE_MAP from SourceIcons)
4. Ema as character: briefing bar with natural language summary ("Mihir, 3 items need your call...")
5. Approve animation: Tailwind transitions (green flash → overlay → collapse → counter update)

### Implementation Phases (5 phases, ~11 new files, ~5 modified)
- A: Utilities + Store (classifyFlaggedItems, deriveRecommendation, store updates)
- B: New Components (SourceCardGrid, AiRecommendationBar, TierSection, 3 card types, modals)
- C: Rewrite Dead-Code Components (NorthStarBanner, FlaggedPanel, StatsPanel)
- D: Page Refactor (EmaBriefingBar, page.tsx slim orchestrator)
- E: Polish + Bug Fixes (dedup, source labels, animations)

### Gate 7 UATs
- G7-01: Manager view renders three tiers with correct classification
- G7-02: Ema briefing bar shows dynamic counts
- G7-03: Source cards render with icons and findings
- G7-04: AI recommendation shown on Tier 1 cards
- G7-05: Approve animation plays (flash → overlay → collapse)
- G7-06: Admin view shows hero banner + stats
- G7-07: View toggle switches between manager and admin
- G7-08: Realtime submission appears in correct tier
- G7-09: No duplicate Tanya entries
- G7-10: tsc clean + build passes

### Detailed plan
See: `.claude/plans/crispy-forging-giraffe.md`
