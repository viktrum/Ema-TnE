> **Part of:** [Main SPEC.md](../SPEC.md) | **Section 10 of 14**

## Section 10: Build Priorities

Every item is classified by demo impact. P0 = the demo breaks or cannot be performed without it. P1 = the demo is significantly weaker, and the panel will notice the gap. P2 = polish that elevates perception but whose absence will not be questioned. P3 = skip entirely for this prototype.

---

### P0 — Must Work for Demo

**The demo cannot happen without these. If any P0 item is broken, the presentation fails.**

**Supabase + Auth + Data Layer**
- [ ] Supabase project created, 10-table schema migrated (users, scenarios, policies, reports, chat_messages, approvals, dashboard_reports, fallbacks, audit_log, ai_metrics)
- [ ] 4 auth users seeded: tanya@nexgen.com (employee), mihir@nexgen.com (manager), chitra@nexgen.com (chro), admin@nexgen.com (admin)
- [ ] RLS policies active: employee sees own, manager sees team, CHRO sees all
- [ ] Login page: 4 user cards, click to login, redirect by role
- [ ] Realtime enabled on `reports` + `approvals` tables
- [ ] Mumbai scenario seeded in `scenarios` table: 7 transactions with all fields, context sources
- [ ] Policy document seeded in `policies` table: all limits, domestic + international tiers
- [ ] Fallback responses seeded in `fallbacks` table: pre-computed assembly + 5 chat responses for Mumbai
- [ ] 47 dashboard reports seeded in `dashboard_reports` table

**API Layer (tRPC + LLM)**
- [ ] tRPC server setup: init with superjson, Supabase context with auth
- [ ] `report.assemble` tRPC procedure — reads scenario + policy from Supabase, sends to LLM, returns AssemblyOutput, writes to `reports` table. Retry (1x, 3s delay) + fallback from `fallbacks` table.
- [ ] `app/api/chat/route.ts` — plain Next.js API route for SSE streaming. Reads chat history from `chat_messages`, calls LLM, streams response, writes completed message to `chat_messages`.
- [ ] LLM client wrapper: Claude or OpenAI, streaming (SSE), retry, timeout (8s assembly, 5s chat), fallback from Supabase. All calls write to `ai_metrics` table.
- [ ] Structured output parsing: Zod validation on all LLM responses — malformed output triggers fallback.

**Chat UI (Employee Screen)**
- [ ] Slack-like layout: left sidebar (scenario name, trip dates, status), main message area, input bar at bottom
- [ ] Initial assembly message from Ema: greeting → expense table (7 rows with columns: Item, Amount, Category, Source Icons, Confidence Badge) → hero explanation (dinner reasoning, PRE-EXPANDED, not behind a click) → gap question (taxi between hotel and restaurant)
- [ ] Streaming display: token-by-token rendering with cursor animation. Messages build visually as tokens arrive.
- [ ] Typing indicator: three-dot animation that appears immediately when user sends a message, disappears when first token of response arrives
- [ ] Employee text input: free-text input bar. Send on Enter. Sends to `/api/chat` and renders streaming response.
- [ ] Confidence badges: colored pills per expense item — green (>90%), yellow (70-90%), red (<70%). Dinner should be yellow.
- [ ] Source icons: small icons per expense item indicating data source — credit card, calendar, email, CRM, policy. Tooltip on hover showing source detail.
- [ ] Dinner reasoning PRE-EXPANDED: the hero moment. Three source cards visible without any click: Calendar (client dinner, Reliance, 3 attendees), CRM (active deal, ₹2Cr), Policy (client entertainment limit ₹15,000). This must be visible on initial load. Non-negotiable.
- [ ] `[Confirm & Submit]` button: appears after gap question is answered OR after a 2-message exchange. Triggers success state with message: "Report submitted. Routing to Mihir for review."
- [ ] Fallback rendering: if `/api/assemble` fails, render from fallback JSON identically. No visual difference. No error state shown to user.

**Resilience**
- [ ] Fallback system integration test: remove API key from env, reload page, verify Mumbai scenario renders identically from fallback JSON
- [ ] Streaming error recovery: if stream cuts mid-message, append "[Ema is thinking...]" and retry once after 2 seconds

---

### P1 — Should Work for Demo

**The demo can technically happen without these, but the panel will notice gaps. Missing P1 items make the prototype feel like a mockup rather than a product.**

**Dashboard (Admin Screen)**
- [ ] 3-panel layout: Left = Auto-Approved (list of reports with confidence scores, green theme), Center = Flagged for Review (list with yellow/red indicators, expandable reasoning), Right = CHRO Health Metrics (summary stats)
- [ ] North Star hero banner: "4 hours" displayed at 48px+ font weight at the top of the dashboard. Subtitle: "Average time from trip-end to submitted report. Industry average: 8 days." This is the single number that sells the product to Surojit.
- [ ] Flagged detail panel: click Tanya's dinner in the flagged list → expand to show the same 3-source reasoning chain from the chat (Calendar, CRM, Policy). Manager sees the exact same context the employee saw.
- [ ] `[Approve]` button with animation: click → item slides out of flagged panel → auto-approved count increments (38 → 39) → flagged count decrements (9 → 8) → toast notification: "Approved. Tanya notified."
- [ ] `[Reject]` button: click → modal with pre-filled rejection reason → confirm → item removed, toast: "Rejected. Tanya notified with reason."
- [ ] `[Ask Employee]` button: click → modal with pre-drafted question (policy-aware, specific to the flagged item) → send → toast: "Message sent to [employee name]."
- [ ] Mock data for dashboard: 47 total reports. 38 auto-approved (variety of names, amounts, trip types). 9 flagged (including Tanya's dinner, Sneha's minibar, and 7 others with different flag reasons: missing receipt, over-limit, duplicate detection, unusual category, etc.)

**Chat Enhancements**
- [ ] "Why this category?" expandable reasoning on ALL expense items (not just the dinner). Click any row → see the 1-3 source cards that informed the categorization. Most will be simple (Uber → Transport, card feed only). The dinner is complex. The contrast proves the AI scales its reasoning.
- [ ] Edit category: click category cell → dropdown of valid categories → select → triggers `/api/categorize` call → returns new reasoning → updates row. Demo script: change "Uber" from "Transport" to "Client Transport" and watch the AI explain why the confidence changed.
- [ ] Edit amount: click amount cell → inline input → type new amount → updates total. No API call needed for simple amount edit.
- [ ] Streaming for assembly (SSE): the initial assembly message streams in token-by-token rather than appearing all at once. This is a credibility signal — the panel can see the LLM is running live. (Note: if assembly streaming is too complex, render the table after a loading state with progress steps — this is the P2 alternative.)

**Additional Scenarios**
- [ ] Bangalore scenario data: Vikram, 4 transactions, hero = team lunch split detection (3 attendees, per-person limit applied instead of total). Simpler than Mumbai — good for "show me something different."
- [ ] Scenario selector page (`/`): three cards (Mumbai, Bangalore, London) with trip summary (traveler name, dates, transaction count, hero feature). Click → navigate to `/chat?scenario=mumbai`. Clean, minimal.

**Interaction Polish**
- [ ] Post-action feedback loop: after every user action (submit, approve, reject, edit), show a visual confirmation (toast, animation, counter update). No action should feel like it disappeared into the void.
- [ ] Keyboard shortcut `Ctrl+D`: auto-fills the expected response for the current gap question. Saves typing during live demo. Small "Ctrl+D" hint text next to the input bar (visible to presenter, subtle enough that panel won't notice).

---

### P2 — Nice to Have

**Polish items that elevate perception. Build these only after all P0 and P1 are solid and tested.**

- [ ] London scenario data: Priya, 5 transactions, multi-currency (GBP hotel, GBP meals, GBP transport), hero = international policy tier application (London limits differ from domestic). Conversion rates displayed inline.
- [ ] "Before" state splash: when first navigating to `/chat`, show a faded/grayed-out Concur-like form (15 empty fields, no data) for 3 seconds, then transition-wipe to the Ema chat with the assembled report. Visual metaphor for the entire thesis. Skippable on click.
- [ ] Add expense in chat: type "I also had a ₹300 coffee" → AI responds with categorization and adds a new row to the table with a highlight animation. The row fades from yellow to white over 2 seconds.
- [ ] Remove expense: hover over a row → subtle × icon appears → click → "Remove this item?" confirmation → removed with slide-out animation.
- [ ] Trend chart in CHRO panel: sparkline or small bar chart showing auto-approve rate improving over 4 weeks (72% → 76% → 79% → 81%). Sells the "gets smarter over time" narrative.
- [ ] Loading progress steps during assembly: instead of a generic spinner, show sequential status messages: "Checking card transactions..." → "Matching calendar events..." → "Reading travel policy..." → "Assembling report..." Each appears for 1-2 seconds. Makes the cross-system reasoning visible.
- [ ] Receipt upload mock: attachment icon in chat input → file picker → select an image → AI responds: "Got it — receipt from Trishna, ₹8,500. Matches your dinner entry. Attached." No actual OCR, just pattern-matched to existing transactions.
- [ ] Scenario-aware dashboard: when switching scenarios, the flagged items in the dashboard change to match. Mumbai = Tanya's dinner. Bangalore = Vikram's team lunch. London = Priya's hotel currency mismatch.
- [ ] Demo shortcut expanded: `Ctrl+1` through `Ctrl+4` for pre-set responses to common improvisation requests (add coffee, gift question, receipt upload, change amount). Presenter cheat codes.
- [ ] Dark mode toggle: single button in top-right corner. Some projectors/screens look better in dark mode. No functionality change.

---

### P3 — Skip Entirely

**These are out of scope for a demo prototype. Building any of these subtracts time from P0/P1 items that directly impact demo quality.**

- [ ] Real integrations (Google Calendar API, Salesforce API, HDFC card feed, email parsing) — all context is hardcoded in scenario JSONs. The AI reasons over the data; it does not need to fetch it live.
- [ ] Authentication or login flow — the prototype starts at the scenario selector. No login screen.
- [ ] Multi-user support, sessions, or database persistence — all state is in-memory per page load. Refreshing resets.
- [ ] Separate policy rules engine — the LLM reads the policy JSON as context and applies it during reasoning. A dedicated rules engine is engineering overhead with zero demo impact.
- [ ] Email/Slack notifications — toasts simulate notifications. No actual messages sent.
- [ ] Mobile or responsive design — demo is on a laptop, either projected or screen-shared. Fixed-width layout is fine.
- [ ] Real receipt OCR — receipt upload (P2) is pattern-matched, not vision-processed.
- [ ] Audit log persistence — actions are visible in the UI but not stored anywhere.
- [ ] Unit tests or integration tests — the "tests" for this prototype are the 5 evals (see build order) and the pre-demo checklist. Traditional test suites are overhead.
- [ ] CI/CD pipeline — deploy manually to Netlify via `netlify deploy --prod` or run locally. No pipeline needed for a one-time demo.
- [ ] Accessibility (a11y) compliance — important for production, irrelevant for a 3-minute demo.
- [ ] i18n / multi-language — all content is English with INR amounts.

---

### Recommended Build Order

This sequence minimizes rework and ensures a demoable state at every checkpoint. Each phase ends with a "demo gate" — a point where you could stop building and still present.

**Phase 1: Data + LLM Foundation (Day 1 morning, ~3 hours)**

| # | Task | Why This Order |
|---|------|---------------|
| 1 | Mumbai scenario JSON (7 transactions, all fields, all context sources) | Everything downstream depends on the data shape |
| 2 | Policy JSON (all rules referenced in demo script) | LLM needs this in-context for every call |
| 3 | Fallback JSONs (pre-computed assembly output, 3 chat responses) | Safety net must exist before any API work |
| 4 | LLM client wrapper (Claude/OpenAI, streaming, retry, timeout, fallback) | Single module, tested in isolation before any route uses it |
| 5 | `/api/assemble` route (scenario → prompt → LLM → AssemblyOutput) | The primary API — chat UI depends on this |
| 6 | `/api/chat` route (message → prompt → LLM → SSE stream) | The secondary API — conversational flow depends on this |

**Gate 1:** Both APIs return correct structured output in terminal/Postman. Fallback works when API key is removed.

**Phase 2: Chat UI — Core Loop (Day 1 afternoon, ~4 hours)**

| # | Task | Why This Order |
|---|------|---------------|
| 7 | Chat layout: sidebar + message area + input bar | Skeleton before content |
| 8 | Message rendering: Ema messages (structured) + user messages (plain) | Need to display before we can stream |
| 9 | Streaming display: token-by-token rendering with cursor | Core UX — proves the LLM is live |
| 10 | Assembly integration: page load → `/api/assemble` → render initial message | The first thing the demo audience sees |
| 11 | Expense table component: 7 rows, all columns, confidence badges, source icons | The primary data visualization |
| 12 | Dinner reasoning pre-expanded: 3 source cards, always visible | **The hero moment. Test this obsessively.** |
| 13 | Gap question + employee input → `/api/chat` → streaming response | The interactive moment in the demo |
| 14 | Typing indicator + [Confirm & Submit] + success state | Completes the employee flow |

**Gate 2:** Full Mumbai employee demo is executable end-to-end. Steps 1-5 of demo script work. **You could present with just this.**

**Phase 3: Dashboard (Day 2 morning, ~3 hours)**

| # | Task | Why This Order |
|---|------|---------------|
| 15 | Dashboard layout: hero banner + 3 panels | Skeleton |
| 16 | North Star metric: "4 hours" in 48px | The single most important number |
| 17 | Auto-approved panel: list of 38 reports with confidence scores | Left panel |
| 18 | Flagged panel: 9 reports, Tanya's dinner expandable with reasoning | Center panel — the interactive part |
| 19 | [Approve] / [Reject] / [Ask Employee] buttons + animations | Manager actions |
| 20 | CHRO health panel: summary stats (81% auto-approve, ₹2.1L processed, 4hr avg) | Right panel |

**Gate 3:** Full demo script (Steps 1-7) is executable. Both screens work. **This is the target minimum for presentation.**

**Phase 3.5: Bidirectional Realtime (Day 2, ~1.5 hours)**

| # | Task | Why This Order |
|---|------|---------------|
| 20.1 | Migration: add `dashboard_reports` + `chat_messages` to realtime publication, INSERT RLS | Enables both flows |
| 20.2 | `report.submit` → INSERT into `dashboard_reports` (data-driven mapper using scenario_id) | Flow 1: Tanya submits → Mihir sees |
| 20.3 | Approval router → INSERT into `chat_messages` as Ema notification | Flow 2: Mihir acts → Tanya sees (persisted + real-time via postgres_changes) |
| 20.4 | Dashboard: switch realtime channel to `dashboard_reports` | Dashboard picks up submitted reports |
| 20.5 | Chat: add `chat_messages` realtime subscription with dedup | Chat receives notifications without refresh |

**Gate 3.5:** Side-by-side demo works: Tanya submits → Mihir sees in 2s → Mihir approves → Tanya sees Ema message in 2s → refresh → message persists. **This is the strongest demo moment.**

**Phase 4: Depth + Scenarios (Day 2 afternoon, ~3 hours)**

| # | Task | Why This Order |
|---|------|---------------|
| 21 | "Why this category?" expandable reasoning on all items | Depth beyond the hero moment |
| 22 | Edit category + `/api/categorize` + updated reasoning | Interactive depth |
| 23 | Edit amount + total recalculation | Simple but impressive |
| 24 | Bangalore scenario data + assembly | Improvisation Script A |
| 25 | Scenario selector page (/) | Navigation between scenarios |
| 26 | Ctrl+D demo shortcut | Presenter convenience |

**Gate 4:** Demo script + all 4 improvisation scripts are executable. Scenario switching works. **This is the target for a strong presentation.**

**Phase 5: Polish (Day 3 or remaining time, ~2 hours)**

| # | Task | Why This Order |
|---|------|---------------|
| 27 | London scenario | Third scenario option |
| 28 | Loading progress steps during assembly | Visual cross-system reasoning |
| 29 | "Before" state splash | Emotional contrast opener |
| 30 | Trend chart in CHRO panel | "Gets smarter" narrative |

**Gate 5:** Fully polished. Every P2 item that was built has been tested. **Presentation-ready with maximum impact.**

**Phase 6: Evals + Rehearsal (Final ~2 hours, non-negotiable)**

| # | Task | Why This Order |
|---|------|---------------|
| 31 | Write 5 evals: (1) dinner re-categorization correct, (2) gap detection present, (3) cash taxi under threshold correctly handled, (4) assembly has all 7 transactions, (5) gift question routed to compliance not expense | Evals catch prompt regressions |
| 32 | Run evals, iterate prompts until 4/5 pass consistently | Prompt stability |
| 33 | Full demo rehearsal with timer | Timing calibration |
| 34 | Pre-demo checklist run-through | Final safety check |

**Gate 6:** Evals pass. Rehearsal completed under time. Checklist green. **Ready to present.**

---

### Dependency Map

```
Scenario JSON ──→ Fallback JSONs
      │                 │
      ▼                 ▼
  Policy JSON ──→ LLM Client ──→ /api/assemble ──→ Chat UI ──→ Assembly Integration
                       │                                            │
                       ▼                                            ▼
                  /api/chat ──────────────────────────→ Chat Input + Streaming
                                                                    │
                                                                    ▼
                                                            [Confirm & Submit]
                                                                    │
                                                                    ▼
                  Dashboard Layout ──→ Hero Banner ──→ Flagged Panel ──→ Action Buttons
                                                                              │
                                                                              ▼
                  Bangalore Data ──→ Scenario Selector ──→ Multi-scenario Support
```

**Critical path:** Scenario JSON → Policy JSON → LLM Client → `/api/assemble` → Chat UI → Assembly Integration → Dinner Reasoning Pre-expanded. Everything on this path is P0. A delay on any item delays the entire demo.

**Parallel tracks after Gate 1:** Chat UI and Dashboard can be built in parallel by different agents or in separate coding sessions — they share no components except the navigation tab bar.