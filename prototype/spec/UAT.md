# User Acceptance Tests — T&E AI Employee Prototype
> **Version:** 1.0 | **Date:** 2026-03-01 | **Purpose:** Definition of done per build phase gate
> **Part of:** [Main SPEC.md](prototype/SPEC.md)

## How to Use This Document

This is the **coding agent's acceptance criteria**. After completing each build phase, run that gate's tests. Every test must pass before proceeding to the next phase. If a test fails, fix it before moving on.

Tests are **manual verification** — the coding agent checks each one visually (browser) or via terminal (API calls). No test framework needed.

**Notation:**
- **STEPS:** What to do
- **EXPECT:** What must be true
- **CRITICAL:** Means this is a non-negotiable demo requirement — failure here blocks the entire presentation

---

## Gate 1: Data + LLM Foundation

> **Preconditions:** Mumbai scenario JSON, policy JSON, fallback JSONs, LLM client, `/api/assemble`, `/api/chat` all built. Dev server running.

### G1-01: Assembly API returns valid output

**STEPS:** Send POST to `/api/assemble` with `{ "scenario_id": "mumbai-trip" }`
**EXPECT:**
- Response is 200 OK
- Response body is valid JSON matching AssemblyOutput schema
- `report.items` array has exactly 7 items
- `report.traveler` is "Tanya Sharma"
- `report.total_amount` is 39280
- Item with vendor "Trishna" has `category` = "Client Entertainment"
- Item with vendor "Trishna" has `original_category` = "Personal Meal" (or similar)
- `report.missing_items` has at least 1 item (hotel→restaurant transport gap)
- `report.summary.total_items` is 7

### G1-02: Chat API streams SSE for initial message

**STEPS:** Send POST to `/api/chat` with assembled report, empty conversation history, and `user_message: "__INITIAL__"`. Listen for SSE events.
**EXPECT:**
- Response Content-Type is `text/event-stream`
- At least 10 `data: {"token": "..."}` events arrive
- Final event is `data: {"done": true, "full_response": {...}}`
- `full_response` is valid ChatOutput
- `full_response.response` mentions "Tanya" and contains expense table markdown
- `full_response.show_submit_button` is false (gap question not yet answered)

### G1-03: Chat API handles taxi confirmation

**STEPS:** Send POST to `/api/chat` with assembled report, conversation history from G1-02, and `user_message: "Yes, ₹1,100. No receipt."`
**EXPECT:**
- SSE stream completes
- `full_response.actions` contains an `update_amount` action for the taxi item
- `full_response.response` mentions "1,100" or "1100"
- `full_response.response` mentions "no receipt" or "threshold"
- `full_response.show_submit_button` is true

### G1-04: Categorize API returns valid output

**STEPS:** Send POST to `/api/categorize` with a transaction (₹200 airport chai) + trip context + policy
**EXPECT:**
- Response is valid CategorizeOutput
- `category` is reasonable (e.g., "Meals & Beverages" or similar)
- `confidence` is a number between 0-100
- `reasoning` is non-empty and mentions the amount
- `policy_status` is one of the valid enum values

### G1-05: Fallback API serves correct JSON

**STEPS:** Send GET to `/api/fallback?scenario=mumbai-trip&key=assembly`
**EXPECT:**
- Response is valid AssemblyOutput JSON
- Same structure as live assembly output (7 items, correct traveler)

**STEPS:** Send GET to `/api/fallback?scenario=mumbai-trip&key=chat-initial`
**EXPECT:**
- Response contains a valid chat response with greeting + table

### G1-06: Health check reports status

**STEPS:** Send GET to `/api/health`
**EXPECT:**
- Response has `status` field ("healthy", "degraded", or "unhealthy")
- `llm.configured` is true (API key is set)
- `data.scenarios` is true (JSON files exist)

### G1-07: Fallback activates on missing API key — CRITICAL

**STEPS:** Remove or blank out the LLM API key from environment. Send POST to `/api/assemble` with `{ "scenario_id": "mumbai-trip" }`
**EXPECT:**
- Response is still 200 OK (NOT 500 or error)
- Response body is valid AssemblyOutput (from fallback)
- `_meta.source` is "fallback" (or similar indicator)
- Restore the API key after test

### G1-08: Zod schema validation rejects bad data

**STEPS:** Send POST to `/api/assemble` with `{ "scenario_id": "invalid-trip" }`
**EXPECT:**
- Response is 400 (bad request)
- NOT a 500 error or stack trace

### Gate 1 Smoke Test (30 seconds)

Run `/api/assemble` for Mumbai → check 7 items in response → remove API key → run again → check fallback works → restore key. If all pass, Gate 1 is green.

---

## Gate 2: Chat UI — Core Loop

> **Preconditions:** Gate 1 passes. Chat page (`/chat`) built with all core components. Dev server running.

### G2-01: Chat page load sequence — CRITICAL

**STEPS:** Navigate to `/chat?scenario=mumbai-trip` in browser
**EXPECT:**
- Loading state appears immediately (skeleton or "Reviewing your trip..." message with Ema avatar)
- Never a blank white screen
- After assembly completes (~3-8s), streaming begins
- Greeting message streams in token-by-token (visible typing effect)
- After greeting: expense table renders with 7 rows
- After table: dinner hero explanation appears
- After explanation: gap question about taxi appears

### G2-02: Expense table renders correctly — CRITICAL

**STEPS:** After G2-01 completes, inspect the expense table
**EXPECT:**
- 7 rows visible
- Each row has: description, amount (₹ formatted), category, confidence badge, source icons
- Amounts: ₹4,850 / ₹18,400 / ₹780 / ₹8,500 / ₹350 / ₹5,200 / ₹1,200
- Total shows ₹39,280

### G2-03: Dinner row visual distinction — CRITICAL

**STEPS:** Look at the dinner row (Trishna, ₹8,500)
**EXPECT:**
- Row has visual distinction (amber/yellow highlight, border, or background)
- Category shows "Client Entertainment" (not "Personal Meal")
- Confidence badge shows ~94% in yellow range (70-90%)

### G2-04: Dinner reasoning PRE-EXPANDED — CRITICAL

**STEPS:** Look below the dinner row immediately after page load (do NOT click anything)
**EXPECT:**
- Reasoning panel is ALREADY visible (expanded by default)
- Reasoning mentions Google Calendar (client dinner, Reliance)
- Reasoning mentions Salesforce CRM (deal, pipeline value)
- Reasoning mentions company policy (₹5,000 meal limit, ₹15,000 entertainment limit)
- Source icons visible for each system cited

### G2-05: Cash taxi row shows low confidence

**STEPS:** Look at the last row (local taxi, ₹1,200)
**EXPECT:**
- Confidence badge shows ~67% in red or yellow range
- Row has warning visual (different from dinner's amber)
- Description indicates estimated / gap-detected

### G2-06: Source icons and tooltips

**STEPS:** Hover over source icons on the flight row (IndiGo BLR→BOM)
**EXPECT:**
- Icons for corporate card + email visible
- Tooltip shows system name (e.g., "HDFC Corporate Card", "Email Confirmation")

### G2-07: Confidence badge colors

**STEPS:** Scan all 7 rows
**EXPECT:**
- Flights (98%), hotel (97%), Ubers (95-96%): green badges (>90%)
- Dinner (94%): yellow/amber badge (contextual — it was re-categorized)
- Taxi (67%): red or dark yellow badge (<70%)

### G2-08: Typing indicator during streaming

**STEPS:** Trigger a new chat message (type something and send)
**EXPECT:**
- Typing indicator (animated dots) appears immediately
- Dots disappear when first token of response arrives
- Tokens stream in visibly (not all-at-once)

### G2-09: Taxi confirmation flow — CRITICAL

**STEPS:** Type "Yes, ₹1,100. No receipt." in the chat input and press Enter (or use Ctrl+D shortcut)
**EXPECT:**
- User message appears right-aligned
- Typing indicator shows
- AI response streams in
- Response acknowledges ₹1,100
- Response mentions no-receipt threshold (₹1,500)
- Taxi row in table updates to ₹1,100 (was ₹1,200)
- Total updates to ₹39,180 (was ₹39,280)
- Taxi confidence increases (was 67%, should increase)
- [Confirm & Submit] button appears

### G2-10: Submit flow — CRITICAL

**STEPS:** Click [Confirm & Submit] button
**EXPECT:**
- Success message appears ("Submitted" or "Report submitted. Routing to Mihir for review.")
- Button becomes disabled or disappears
- No error state
- Chat shows summary (e.g., "5 auto-approved, dinner routed to Mihir")

### G2-11: Ctrl+D demo shortcut

**STEPS:** Reload page. After gap question appears, press Ctrl+D (or Cmd+D on Mac)
**EXPECT:**
- Input field auto-fills with expected response (e.g., "Yes, ₹1,100. No receipt.")
- Does NOT auto-send — just fills the input

### G2-12: Sidebar renders correctly

**STEPS:** Check left sidebar
**EXPECT:**
- Ema logo visible at top
- Channel list: #general, #engineering, **#expense-reports** (highlighted as active), #travel-policy
- Tanya Sharma avatar + "Online" status at bottom

### Gate 2 Smoke Test (30 seconds)

Load `/chat?scenario=mumbai-trip` → table has 7 rows → dinner reasoning visible without clicking → type Ctrl+D → send → AI responds → click Submit → success. If this flow works end-to-end, Gate 2 is green.

---

## Gate 3: Dashboard

> **Preconditions:** Gate 2 passes. Dashboard page (`/dashboard`) built. Dev server running.

### G3-01: Dashboard layout loads

**STEPS:** Navigate to `/dashboard?scenario=mumbai-trip`
**EXPECT:**
- Three-panel layout visible (left, center, right)
- Top bar shows "NexGen Industries" branding + "T&E Intelligence Dashboard"
- No blank panels or layout collapse

### G3-02: North Star hero banner — CRITICAL

**STEPS:** Look at the top of the dashboard
**EXPECT:**
- "4 hours" displayed prominently (48px+ font or equivalent large size)
- Subtitle: "Trip-end to submitted report" (or similar)
- Industry comparison: "8+ days" in smaller/muted text
- This is the LARGEST text element on the page

### G3-03: Auto-approved panel (left)

**STEPS:** Check the left panel
**EXPECT:**
- Header: "Auto-Approved" with count badge (38)
- List of report cards, each showing: traveler name, trip destination, total amount, confidence
- Cards are scrollable (38 items don't all fit)
- Global mix of names (not all Indian — includes international names)

### G3-04: Flagged panel (center) — CRITICAL

**STEPS:** Check the center panel
**EXPECT:**
- Header: "Needs Review" with count badge (9)
- Tanya's dinner is the featured/top item
- Tanya's dinner reasoning is EXPANDED (shows Calendar + CRM + Policy)
- 8 other flagged items visible below with variety (duplicate, missing receipt, pattern anomaly, etc.)
- Each flagged item has [Approve] [Reject] [Ask Employee] buttons

### G3-05: Dinner reasoning matches chat

**STEPS:** Compare dinner reasoning in dashboard vs what was shown in chat
**EXPECT:**
- Same three sources cited (Calendar, CRM, Policy)
- Same conclusion (Client Entertainment, ~94% confidence)
- Same key data points (Reliance, ₹2Cr deal, ₹15K limit)

### G3-06: Approve flow with animation — CRITICAL

**STEPS:** Click [Approve] on Tanya's dinner
**EXPECT:**
- Item animates out (slide/fade)
- Toast notification: "Approved" (or "Approved. Tanya notified.")
- Auto-approved count updates: 38 → 39
- Flagged count updates: 9 → 8
- Item is no longer in the flagged list

### G3-07: Reject flow with modal

**STEPS:** Click [Reject] on another flagged item
**EXPECT:**
- Modal appears with reason field (dropdown or text)
- Can enter/select a reason and confirm
- Item is removed from flagged list on confirm
- Toast: "Rejected" (or similar)

### G3-08: Ask Employee flow

**STEPS:** Click [Ask Employee] on another flagged item
**EXPECT:**
- Modal appears with pre-drafted question (related to the flagged issue)
- Can send the question
- Item status changes to "Awaiting Response" (yellow badge or similar)
- Toast: "Message sent to [employee name]"

### G3-09: CHRO health panel (right)

**STEPS:** Check the right panel
**EXPECT:**
- Stats visible: Reports (47), Auto-Approved (81%), Flagged (19%), Avg Confidence (93%), Avg Time (4hrs), Compliance (96%)
- Numbers are formatted clearly
- Directional indicators (↑ or ↓ compared to previous period)

### G3-10: Navigation preserves scenario

**STEPS:** From dashboard with Mumbai scenario, navigate to `/chat?scenario=mumbai-trip`, then back to dashboard
**EXPECT:**
- Chat loads Mumbai data (not blank)
- Dashboard still shows Mumbai data on return
- No state corruption between screens

### Gate 3 Smoke Test (30 seconds)

Load `/dashboard?scenario=mumbai-trip` → "4 hours" visible at top → Tanya's dinner in flagged list with reasoning → click Approve → counts update → check right panel shows 81%. If this works, Gate 3 is green.

---

## Gate 3.5: Bidirectional Realtime (Tanya ↔ Mihir)

> **Preconditions:** Gate 3 passes. Realtime bridge between chat and dashboard built. Dev server running.

### G3.5-01: Submit creates dashboard entry — CRITICAL

**STEPS:** Login as Tanya → `/chat?scenario=mumbai-trip` → assemble report → answer gap question → click "Confirm & Submit"
**EXPECT:**
- Report submits successfully (toast: "Expense report submitted")
- Check Supabase `dashboard_reports` table → new row exists with:
  - `scenario_id = 'mumbai-trip'`
  - `traveler_name = 'Tanya Sharma'`
  - `status` = 'flagged' or 'auto_approved' (based on flagged_items)
  - `item_count` matches number of expense items
  - `avg_confidence` is a reasonable number (60-100)
  - `destination` and `dates` populated from scenario

### G3.5-02: Dashboard receives submitted report in real-time — CRITICAL

**STEPS:** Open two tabs. Tab A: Tanya `/chat`. Tab B: Mihir `/dashboard`. In Tab A, submit a report.
**EXPECT:**
- Tab B shows toast: "New report from Tanya Sharma" within 2 seconds
- New item appears in Mihir's inbox (flagged list or auto-approved list)
- No manual refresh needed on Tab B
- Counts update (flagged count or auto-approved count increments)

### G3.5-03: Approve notification appears in chat — CRITICAL

**STEPS:** Continue from G3.5-02. In Tab B (Mihir), click "Approve" on the submitted report.
**EXPECT:**
- Tab A (Tanya's chat): new Ema message appears within 2 seconds: "Mihir has approved your expense report"
- Toast notification appears alongside the message
- No manual refresh needed on Tab A
- Message is from Ema (assistant role, left-aligned like other Ema messages)

### G3.5-04: Reject notification appears in chat with reason

**STEPS:** Submit another report (or use a seeded flagged item). Mihir clicks "Reject" with reason "Policy Violation" and notes "Amount exceeds limit".
**EXPECT:**
- Tanya's chat: new Ema message within 2 seconds: "Mihir has rejected your expense report. Reason: Policy Violation. Amount exceeds limit"
- Toast notification appears
- No manual refresh needed

### G3.5-05: Ask Employee notification appears in chat with question

**STEPS:** Mihir clicks "Ask Employee" on a flagged item, types question, sends.
**EXPECT:**
- Tanya's chat: new Ema message within 2 seconds: "Question from Mihir: {question text}"
- Toast notification appears
- No manual refresh needed

### G3.5-06: Notification persists on refresh

**STEPS:** After G3.5-03 (approval notification appeared), refresh Tab A (Tanya's chat page).
**EXPECT:**
- All previous chat messages reload from `chat_messages` table
- The approval notification message is still visible in the chat history
- It renders like any other Ema message (not lost on refresh)

### G3.5-07: No duplicate messages from streaming

**STEPS:** In Tanya's chat (with realtime subscription active), send a regular chat message and wait for Ema's SSE response.
**EXPECT:**
- Ema's response appears once (not duplicated)
- The `chat_messages` realtime subscription does NOT create a second copy of the streamed message
- Dedup logic works correctly

### G3.5-08: Dashboard counts update after approval

**STEPS:** Mihir approves a flagged item submitted by Tanya.
**EXPECT:**
- Item disappears from flagged inbox
- Flagged count decrements
- Stats bar updates
- On refresh, item stays gone (status changed in DB)

### Gate 3.5 Smoke Test (60 seconds)

Tab A: Tanya submits Mumbai report → Tab B: Mihir sees it in inbox within 2s → Mihir approves → Tab A: Ema message appears within 2s → refresh Tab A → message still there. If this works, Gate 3.5 is green.

---

## Gate 4: Depth + Scenarios

> **Preconditions:** Gate 3 passes. Edit flows, Bangalore scenario, and scenario selector built.

### G4-01: Edit category via dropdown

**STEPS:** On chat page, click the category cell on an Uber ride → dropdown appears → select a different category (e.g., "Client Transport")
**EXPECT:**
- Dropdown has valid category options
- After selection: `/api/categorize` fires
- Reasoning text updates to reflect new category
- Confidence may change
- Row briefly highlights to indicate change

### G4-02: AI disagree nudge

**STEPS:** Change a category to something unusual (e.g., change flight to "Meals")
**EXPECT:**
- If AI disagrees: soft nudge appears below the row ("Ema suggests 'Domestic Flight' — keep yours?")
- Two buttons: [Keep Mine] [Use Ema's Suggestion]
- If user clicks "Use Ema's Suggestion": category reverts to AI's choice

### G4-03: Edit amount inline

**STEPS:** Click the amount on any row → type a new amount → click away (blur)
**EXPECT:**
- Amount changes to new value
- Total recalculates immediately (no API call needed)
- If new amount crosses a policy threshold: AI notes it

### G4-04: Bangalore scenario loads

**STEPS:** Navigate to `/chat?scenario=bangalore-trip`
**EXPECT:**
- Assembly runs for Bangalore scenario
- Different traveler (Vikram Rao), different transactions (4 items)
- Hero moment is different (team lunch split, not dinner re-categorization)
- Chat flow works end-to-end

### G4-05: Scenario selector page

**STEPS:** Navigate to `/` (root)
**EXPECT:**
- 3 scenario cards: Mumbai, London, Bangalore
- Each shows: traveler name, dates, transaction count, description
- "Start Demo" button on each card → navigates to `/chat?scenario={id}`
- "View Dashboard" link → navigates to `/dashboard?scenario={id}`

### G4-06: Scenario switch resets state

**STEPS:** Complete a partial chat in Mumbai → go to scenario selector → start Bangalore
**EXPECT:**
- Mumbai state does not carry over to Bangalore
- Messages are fresh (no old Mumbai messages)
- Expense table shows Bangalore transactions
- Report total is different

### G4-07: All items have expandable reasoning

**STEPS:** On Mumbai chat, click "Why?" on each of the 7 expense items
**EXPECT:**
- Each item expands to show reasoning
- Simple items (flights, Ubers) have short reasoning citing 1-2 sources
- Complex items (dinner) have detailed reasoning citing 3+ sources
- Collapse works (click again to close)

### G4-08: Ctrl+D works per scenario

**STEPS:** Load Bangalore scenario → after gap question → press Ctrl+D
**EXPECT:**
- Fills the expected response for BANGALORE's gap question (not Mumbai's)

### Gate 4 Smoke Test (30 seconds)

Go to `/` → click Mumbai → verify → go back → click Bangalore → different data loads → edit a category → reasoning updates. Gate 4 green.

---

## Gate 5: Polish

> **Preconditions:** Gate 4 passes. Polish items built.

### G5-01: "Before" splash screen

**STEPS:** Navigate to `/chat?scenario=mumbai-trip` (fresh load, not cached)
**EXPECT:**
- Faded/grayed Concur-like form appears as overlay for ~3 seconds
- Text overlay: something about "15 fields. 20 minutes." (or similar contrast message)
- After 3s: fades/transitions to the Ema chat
- Clicking during the splash skips it immediately

### G5-02: Loading progress steps

**STEPS:** During assembly loading (after "Before" splash fades)
**EXPECT:**
- Sequential status messages appear: "Checking card transactions..." → "Matching calendar events..." → "Reading travel policy..." → "Assembling report..."
- Each visible for 1-2 seconds
- Transitions to streaming when assembly returns

### G5-03: Trend chart in CHRO panel

**STEPS:** Check dashboard right panel
**EXPECT:**
- Small chart showing auto-approve rate over 4 weeks: ~74% → 77% → 79% → 81%
- Chart is readable (not too small)

### G5-04: London scenario (if built)

**STEPS:** Navigate to `/chat?scenario=london-trip`
**EXPECT:**
- Different traveler (Priya Krishnamurthy), international trip
- Multi-currency transactions (GBP amounts with INR conversion shown)
- Different hero moment (hotel policy tier, not dinner)

### Gate 5 Smoke Test (15 seconds)

Load Mumbai chat → see "Before" splash → see progress steps → verify trend chart on dashboard. Gate 5 green.

---

## Gate 6: Evals + Rehearsal

> **Preconditions:** Gate 5 passes (or Gate 3/4 minimum). All AI evals written.

### G6-01: AI evals pass

**STEPS:** Run `npm run evals` (or equivalent) — executes all 5 evals, 3 times each
**EXPECT:**
- At least 4 of 5 evals pass (majority vote across 3 runs)
- Dinner categorization (Eval 1) MUST pass — this is the hero moment
- If only 3/5: investigate and fix before demo
- If <3/5: switch to FALLBACK_MODE for demo

### G6-02: Full demo executable under time

**STEPS:** Run the full demo script (Section 9) with a timer
**EXPECT:**
- Complete in under 3 minutes 30 seconds
- All 7 steps execute without errors
- Streaming is visible (not instant — too fast looks fake)
- No visible errors, loading >8s, or broken layouts

### G6-03: Pre-demo checklist

**STEPS:** Run through this checklist:
- [ ] `/api/health` returns "healthy"
- [ ] Mumbai loads in <8s (assembly + initial chat)
- [ ] Dinner reasoning visible without clicking
- [ ] Typing to "₹1,100" produces correct response
- [ ] Dashboard "4 hours" visible
- [ ] [Approve] button works
- [ ] Remove API key → reload → fallback works → restore key

**EXPECT:** All items checked. If any fail, fix before presenting.

### Gate 6 Smoke Test (60 seconds)

Run evals (4/5 pass) → run demo script with timer (<3:30) → run pre-demo checklist (all green). Gate 6 green. **Ready to present.**

---

## Auth Tests (Gate 1+)

These tests verify authentication and role-based access. Run after Phase 1 and re-check at every subsequent gate.

### AUTH-01: Login page renders — CRITICAL

**STEPS:** Navigate to `/login` (or `/` if unauthenticated)
**EXPECT:**
- 4 user cards: Tanya Sharma (Employee), Mihir Desai (Manager), Chitra Nair (CHRO), Admin
- Each card shows name, role, and avatar
- Clicking a card logs in (no form fields needed)

### AUTH-02: Role-based routing — CRITICAL

**STEPS:** Login as Tanya → check URL. Login as Mihir → check URL.
**EXPECT:**
- Tanya → redirected to `/chat` (or scenario selector)
- Mihir → redirected to `/dashboard`
- Chitra → redirected to `/dashboard`
- Admin → redirected to `/dashboard` (or scenario selector with all options)

### AUTH-03: Unauthenticated redirect

**STEPS:** Clear cookies/session. Navigate directly to `/chat`
**EXPECT:**
- Redirected to `/login`
- No flash of chat content before redirect

### AUTH-04: RLS enforcement

**STEPS:** Login as Tanya. Try to access `/dashboard` by typing URL directly.
**EXPECT:**
- Either redirected away OR dashboard shows empty/limited view
- Tanya cannot see other employees' reports
- No data leak — RLS blocks queries at the database level

### AUTH-05: User switching

**STEPS:** Logged in as Tanya → click logout (or "Switch User") → login as Mihir
**EXPECT:**
- Session clears
- New session starts as Mihir
- Dashboard loads with Mihir's permissions
- No Tanya data visible

---

## Persistence Tests (Gate 2+)

These verify that data survives page reloads.

### PERS-01: Chat persists on reload — CRITICAL

**STEPS:** As Tanya, complete 2-3 chat messages. Press F5 (refresh page).
**EXPECT:**
- Chat history reloads from Supabase
- All previous messages visible (both Ema and user messages)
- Expense table still shows (from persisted report)

### PERS-02: Report persists after submit

**STEPS:** As Tanya, submit a report. Refresh the page.
**EXPECT:**
- Report shows as "submitted" (not draft)
- Cannot re-submit (button disabled or hidden)
- Report data intact (amounts, categories, reasoning)

### PERS-03: Approval persists

**STEPS:** As Mihir, approve Tanya's dinner. Refresh dashboard.
**EXPECT:**
- Approval is still recorded (item not back in flagged list)
- Counts still updated (39 auto-approved, 8 flagged)

### PERS-04: Audit log written

**STEPS:** After several actions (assembly, submit, approve), check Supabase `audit_log` table
**EXPECT:**
- Entries for: AI assembly, employee submit, manager approve
- Each entry has: report_id, action, actor_type (ai/human), timestamp
- AI entries have reasoning in `details` JSONB

---

## Realtime Tests (Gate 3+)

These verify multi-tab sync. **The strongest demo moment.**

### RT-01: Submit triggers dashboard update — CRITICAL

**STEPS:** Open two browser tabs. Tab 1: login as Tanya (`/chat`). Tab 2: login as Mihir (`/dashboard`). In Tab 1, submit a report.
**EXPECT:**
- Within 2 seconds, Tab 2 (Mihir's dashboard) shows the new report
- No manual refresh needed
- Report appears in the correct panel (flagged or auto-approved based on content)

### RT-02: Approve triggers employee notification — CRITICAL

**STEPS:** Continue from RT-01. In Tab 2 (Mihir), click [Approve] on Tanya's dinner.
**EXPECT:**
- Within 2 seconds, Tab 1 (Tanya's chat) shows a toast notification: "Report approved by Mihir" (or similar)
- Chat may show a new system message about the approval

### RT-03: Reject triggers employee notification

**STEPS:** As Mihir, reject a different flagged item.
**EXPECT:**
- Tanya's tab shows toast with rejection reason
- Dashboard counts update

### RT-04: CHRO view updates on approval

**STEPS:** Open Tab 3: login as Chitra (`/dashboard`). Mihir approves an item in Tab 2.
**EXPECT:**
- Chitra's health stats update (auto-approved count, percentages)
- No manual refresh needed

### RT-05: Reconnection after disconnect

**STEPS:** Temporarily disable network (DevTools → Network → Offline). Re-enable.
**EXPECT:**
- Realtime subscription reconnects automatically
- Any changes that happened during disconnect are caught up on reconnection
- No stale data displayed

---

## Cross-Gate Invariants

These must be true at ALL gates, always:

| # | Invariant | Check |
|---|-----------|-------|
| X-01 | No error messages visible to user | No red text, no stack traces, no "Something went wrong" |
| X-02 | No loading state >8 seconds | If assembly/chat takes >8s, fallback activates silently |
| X-03 | No JSON or code visible in UI | All LLM output is parsed and rendered, never raw |
| X-04 | No console errors in browser DevTools | Open DevTools → Console tab → no red errors |
| X-05 | Temperature 0 on every LLM call | Check API request logs — no temperature > 0 |
| X-06 | NexGen Industries naming consistent | Company name appears correctly wherever referenced |
| X-07 | Auth enforced on all protected routes | `/chat` and `/dashboard` redirect to `/login` if unauthenticated |
| X-08 | RLS active | Employee can only see own data. Manager sees team. CHRO sees all. |
| X-09 | Data persists across page reload | Reports, chat messages, approvals survive F5 |
| X-10 | Realtime sync <2 seconds | Action in one tab reflects in another tab within 2 seconds |
