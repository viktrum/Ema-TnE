> **Part of:** [Main SPEC.md](../SPEC.md) | **Section 9 of 14**

## Section 9: Demo Script with Emotional Arc

**Total runtime: ~3 minutes 15 seconds. Every second is allocated.**

The demo is a story in three acts: (1) the employee experience, (2) the hero moment, (3) the business case. The "Before" bridge sets up the contrast so the panel feels the gap before seeing the solution.

---

### Before Bridge (15 seconds, verbal only — no screen action)

| Element | Detail |
|---------|--------|
| **Action** | Stand at the prototype screen but do NOT click anything yet. Gesture vaguely at the screen. |
| **Narration** | "Before we see what this looks like, picture the current state: Tanya comes back from Mumbai, opens Concur, sees 15 empty form fields, has to dig through her email for receipts, figure out the right categories, look up the policy for meal limits... Twenty minutes later, she submits. Her manager rubber-stamps it in three seconds. The entire system runs on employee suffering." |
| **Panel State** | Recognition. Everyone in the room has done this. |
| **Timing** | 15 seconds. |
| **Pacing Note** | Speak conversationally, not from memory. Make eye contact during "employee suffering" — it is the thesis of the entire deck landing one more time before the demo. Do NOT rush this to get to the prototype faster. The contrast is what makes the demo land. |

---

### Step 1: Chat Loads — "It Already Knows" (30 seconds)

| Element | Detail |
|---------|--------|
| **Action** | Navigate to `/chat` (Mumbai scenario pre-loaded). The page fires the `/api/assemble` call. Streaming begins — greeting message, then expense table renders row by row, then the hero explanation, then the gap question. |
| **Narration** | "Tanya's trip ended yesterday. She hasn't opened any expense tool. She hasn't uploaded a single receipt. But look — Ema has already assembled her complete report." |
| **Panel State** | Curious shifting to first surprise ("it already knows"). The word "already" does the work here. |
| **Timing** | 30 seconds (including ~8-12 seconds of streaming animation). |
| **Pacing Note** | Let the streaming settle before speaking again. The animation IS the narration for the first few seconds — typing indicator appears, then Ema's greeting streams in. Say "She hasn't opened any expense tool" while the greeting is streaming. Say "But look" right as the table starts rendering. Silence while the table populates. The audience will read it themselves. |

**If streaming is slow (>5 seconds with no output):** Say "The AI is pulling from card feeds, calendar, CRM, and email to assemble this — you'll see the sources in a moment." This reframes latency as cross-system reasoning rather than a loading spinner.

**If streaming fails and fallback kicks in:** The fallback JSON renders instantly. Say nothing different — the narration works identically. The audience cannot tell the difference. This is why fallback is P0.

---

### Step 2: Walk Through the Table — "Zero Work" (30 seconds)

| Element | Detail |
|---------|--------|
| **Action** | Point to each column header: Item, Amount, Category, Source, Confidence. Hover over 2-3 source icons to show tooltips (card icon → "HDFC Corporate Card", calendar icon → "Google Calendar", CRM icon → "Salesforce"). |
| **Narration** | "Seven transactions. Each one matched to its source — card feed, booking email, calendar events. Categories assigned automatically. Confidence scores on every item. Green means the AI is certain. Yellow means it wants a human to look. Tanya has done zero work so far." |
| **Panel State** | Engaged, examining the data. Engineers will be reading column values. Nilesh will be checking if the categories make sense. |
| **Timing** | 30 seconds. |
| **Pacing Note** | Move your cursor deliberately. Do not wave it across the screen. Point to the Uber ride (green, 98% confidence) as the "easy" one. Point to the dinner (yellow, flagged) but do NOT explain it yet — just let them notice it. End on "zero work" and pause one beat. |

**Column-by-column pointing sequence:**
1. **Item column** — "Flight, hotel, three Uber rides, a dinner, conference registration."
2. **Source column** — hover over icons: "Card feed, booking email, Google Calendar."
3. **Confidence column** — "Green, green, green... yellow on the dinner. We'll come back to that."
4. **Total row** — "₹47,200 total. Auto-calculated."

---

### Step 3: Hero Moment — Dinner Reasoning (45 seconds)

**THIS IS THE DEMO. Everything else exists to set this up and pay it off.**

| Element | Detail |
|---------|--------|
| **Action** | Point to item 4 — the dinner at Trishna, ₹8,500. The reasoning panel is PRE-EXPANDED (not collapsed behind a click). It shows three source cards: Calendar, CRM, Policy. Each card has a one-line finding and a source label. |
| **Narration** | See detailed script below. |
| **Panel State** | **HINGE POINT.** This is where the panel either believes the AI-Shaped thesis or does not. If they believe that cross-system reasoning is the moat, the rest of the interview is a conversation. If they do not, the rest is defense. Invest every second here. |
| **Timing** | 45 seconds. Do not compress this below 40. |
| **Pacing Note** | **READ THE REASONING ALOUD. SLOWLY. Point to each source card as you read it. Pause between sources. Do not summarize — walk through the chain of inference step by step.** |

**Word-for-word narration (rehearse this exact sequence):**

> "This is where it gets interesting."

*(Point to the dinner row)*

> "The dinner at Trishna — eight thousand five hundred rupees. A standard expense tool flags this immediately. Over the five thousand rupee meal limit. Rejected, or sent back to Tanya to explain."

*(Pause 2 seconds. Let them feel the frustration of the old world.)*

> "But look at what the AI found."

*(Point to Calendar source card)*

> "Calendar shows a client dinner with Reliance Industries. Three attendees from their side."

*(Point to CRM source card)*

> "CRM confirms an active deal — two crore rupees, Q3 close target."

*(Point to Policy source card)*

> "Policy says client entertainment limit is fifteen thousand rupees. Not five thousand."

*(Lean back slightly. Slower pace now.)*

> "Three systems. One inference. Correct answer. This dinner is within policy."

*(Full stop. 3-second pause. Let the silence land.)*

> "No expense tool on the market does this today. They see one transaction and one rule. Ema sees the context around the transaction."

**Recovery if panel interrupts with a question during the hero moment:** Answer briefly (one sentence), then say "Let me finish walking through this reasoning — it's the core of the thesis" and return to where you left off. Do NOT let a tangent derail the hero moment.

**What makes this the hero moment (for your internal conviction):**
- It is the ONE example that proves cross-system reasoning is not a feature but an architecture
- Concur cannot do this because it does not have calendar and CRM data
- Navan cannot do this because their AI is bolted onto modules, not reasoning across them
- A rules engine cannot do this because the re-categorization requires judgment, not if-then
- This is the "Can they copy by hiring more engineers?" test — and the answer is no, because the data access pattern is the moat

---

### Step 4: Gap Detection + Employee Response (30 seconds)

| Element | Detail |
|---------|--------|
| **Action** | Scroll down (or it is already visible) to the gap question from Ema: "I noticed there's no transport between Hotel Trident and Trishna restaurant. Did you take a cab?" Point to it. Then type (or press Ctrl+D to auto-fill): "Yes, ₹1,100. No receipt, paid cash." Watch the streaming response arrive: "Got it — ₹1,100 cash taxi. That's under the ₹1,500 no-receipt threshold, so no receipt needed. I've added it to your report. Updated total: ₹48,300." |
| **Narration** | "The AI also noticed something missing. No transport between the hotel and the restaurant on the evening of the dinner. A gap. It asked. Tanya says it was eleven hundred rupees, cash, no receipt." *(Let streaming play)* "Under the no-receipt threshold. Added automatically. The AI is doing the job of the T&E administrator — checking for completeness, not just compliance." |
| **Panel State** | Impressed by proactiveness. The gap detection shows the AI is not just categorizing — it is reasoning about what SHOULD exist but does not. This is the difference between reactive and proactive. |
| **Timing** | 30 seconds (including ~5-8 seconds of streaming response). |
| **Pacing Note** | Type naturally — do not rush. If using Ctrl+D, say "Let me fill in Tanya's response" so it does not look like a magic trick. Let them watch the streaming response arrive token by token. The streaming is a credibility signal — it proves the LLM is running live. |

---

### Step 5: Confirm & Submit — "Ten Seconds" (15 seconds)

| Element | Detail |
|---------|--------|
| **Action** | Click the [Confirm & Submit] button. Success animation plays — checkmark, confetti-free (enterprise, not consumer), message: "Report submitted. Routing to Mihir for review." |
| **Narration** | "Ten seconds of Tanya's time. The old way: twenty minutes and a form." |
| **Panel State** | Forming opinion. The contrast is visceral — they felt the 20-minute pain in the Before Bridge, and now they have seen the 10-second resolution. |
| **Timing** | 15 seconds. |
| **Pacing Note** | **Say the line and then stop talking. Do not add qualifiers, do not say "pretty cool, right?" Do not explain further. The silence after "twenty minutes and a form" is the most powerful beat in the demo. Let it sit for 3 full seconds before moving on.** |

---

### Step 6: Switch to Dashboard — "The Business Case" (90 seconds)

**Enhanced with Phase 3.5 (if bidirectional realtime is built):** Instead of navigating to `/dashboard`, have Mihir's dashboard already open in a second browser tab (side-by-side or picture-in-picture). When Tanya submits in Step 5, point to the dashboard tab — Tanya's report has ALREADY appeared in Mihir's inbox without any manual refresh. This is the most powerful demo moment: "She submitted two seconds ago, and it's already here." Then continue with the regular narration below.

| Element | Detail |
|---------|--------|
| **Action** | Click the Dashboard tab (or point to the already-open dashboard where Tanya's report appeared via realtime). The hero banner loads: "4 hours" in large type — time from trip-end to submitted report. Below it: 3-panel layout. Left: auto-approved (38 reports, green). Center: flagged for review (9 reports, yellow). Right: CHRO health metrics. Then scroll through the flagged panel to highlight the four flagged items: Tanya's dinner, Phantom Client Dinner, Conference Meal Overlap, and Cross-Employee Duplicate. |
| **Narration** | See detailed script below. |
| **Panel State** | Seeing the business case. The shift from employee experience to manager/CHRO value is intentional — this is where Surojit (CEO) and Nilesh (Head of Product) evaluate whether this sells to a CHRO. |
| **Timing** | 90 seconds. |
| **Pacing Note** | Point to the North Star metric FIRST. Do not start with the panels. The hero number needs to land before the detail. Build narrative tension through the dashboard flags. Escalate from simple (familiar flag from Step 3) → downward re-categorization (re-use case) → cross-system validation (LLM power) → climax (cross-employee detection, the thing no manager could see). Pause after each flag to let the implication register. |

**Word-for-word narration (rehearse this exact sequence):**

> "Now here's what Mihir — the manager — sees."

*(If realtime: "She submitted two seconds ago — it's already here.")*

*(Point to hero banner)*

> "The number that matters: four hours from trip-end to submitted report. Industry average is eight days."

*(Pause 2 seconds. Let the comparison register.)*

> "Eighty-one percent of reports auto-approved. No manager time spent. But the flagged center panel — that's where it gets interesting."

*(Point to the flagged panel. Scroll to show the four flagged items.)*

> "Let me walk through these four flags. First — Tanya's dinner from the chat. Tanya's expense, Tanya's judgment needed."

*(Point to Tanya's dinner item, then scroll to the next flag.)*

> "But look at this one. Phantom Client Dinner — Kavita submitted ₹11,000 for client entertainment. All attendees? Internal. Every single one: @nexgen.com. The AI re-classified this down to an internal team meal. Same reasoning as Tanya's dinner — cross-system — but opposite direction. It catches gaming, not just helps genuine cases."

*(Pause. Let the implication land: the tool polices both ways.)*

> "Third flag. Conference Meal Overlap. Arjun attended a three-day conference. Per diem on all three days. But the conference agenda email showed lunch was provided on Days 1 and 3. Only Day 2 is eligible. The AI cross-referenced the conference email to find provided meals."

*(Pause. Slower pace.)*

> "Three different types of judgment. Three different data sources. All automated. But here's the one that sells this."

*(Pause. Take a breath. This is the climax.)*

*(Scroll to the Cross-Employee Duplicate flag.)*

> "Cross-Employee Duplicate. Rohit Patel and Deepa Sharma both submitted ₹12,400 for the same dinner at Spice Route. Same restaurant, same date, same transaction. Rohit submitted it from the calendar event, Deepa submitted from the card feed. The system detected they both claimed the same meal."

*(Full stop. Let silence sit for 3 seconds.)*

> "No expense tool on the market detects this. Why? Because each manager sees only their own employee. A manager reviews Rohit's report — it looks fine. A different manager reviews Deepa's report — it also looks fine. They never talk. The receipt appears twice. Policy violation buried."

*(Lean back. Slower pace.)*

> "Ema sees across employees. Sees across managers. Flags the conflict. Only one person can claim this meal. This is the thing no manager could see individually."

*(Pause 2 seconds.)*

---

### Step 7: Approve — "Done" (15 seconds)

| Element | Detail |
|---------|--------|
| **Action** | Click on Tanya's dinner in the flagged panel. The reasoning chain is visible (same three sources from Step 3). Click [Approve]. Animation: item slides out of flagged panel, auto-approved count increments (38 → 39), flagged count decrements (9 → 8). Toast: "Approved. Tanya notified." *(If Phase 3.5: point to Tanya's chat tab — an Ema message appeared: "Mihir has approved your expense report.")* |
| **Narration** | "Mihir reads the reasoning, agrees, approves. Thirty seconds. Done." *(If Phase 3.5: "And Tanya already knows — look, Ema told her.")* |
| **Panel State** | Convinced. The full loop is closed — from trip-end to reimbursement-ready, with AI doing the assembly, the reasoning, and the routing. Human judgment applied only where it was needed. |
| **Timing** | 15 seconds. |
| **Pacing Note** | **Do not add anything after "Done." The demo is over. Let the silence signal confidence. If you fill the silence, you undermine the landing. Wait for the panel to speak first.** |

---

### Timing Summary

| Step | Duration | Cumulative | Purpose |
|------|----------|------------|---------|
| Before Bridge | 15s | 0:15 | Set up pain |
| Step 1: Chat loads | 30s | 0:45 | First surprise |
| Step 2: Table walkthrough | 30s | 1:15 | Establish competence |
| Step 3: Dinner reasoning | 45s | 2:00 | **Hero moment — win or lose here** |
| Step 4: Gap detection | 30s | 2:30 | Proactiveness proof |
| Step 5: Submit | 15s | 2:45 | Contrast payoff |
| Step 6: Dashboard | 30s | 3:15 | Business case |
| Step 7: Approve | 15s | 3:30 | Close the loop |

**Total: 3 minutes 30 seconds.** Buffer of 30 seconds under a 4-minute allocation, or 30 seconds over a 3-minute allocation. If running long, compress Steps 2 and 6 (table walkthrough and dashboard narration) — they are descriptive, not demonstrative. Never compress Step 3 (hero moment) or Step 5 (the silence after "twenty minutes and a form").

---

### Improvisation Scripts — Panel Requests

**Script A: "Show me a different trip"**

> *"Sure."*

Navigate to scenario selector (/). Click Bangalore (Vikram's trip — 4 transactions, simpler). Let assembly stream.

> *"This is Vikram's Bangalore trip. Four transactions. Watch the team lunch — the AI detected three attendees from the same department, split the receipt automatically, and applied the per-person limit instead of the total limit. Different trip, same cross-system reasoning."*

Point to the lunch item's reasoning panel. If they want more, navigate to London (Priya — multi-currency). Say: *"Priya's London trip. The hotel is in pounds. Watch how the AI applies the international policy tier — different city, different currency, different limits — all resolved without Priya doing anything."*

**Why Bangalore before London:** Bangalore is simpler (4 transactions), loads faster, has a clear hero moment (split detection). London is more complex (multi-currency) and better as a second follow-up if they want to keep exploring.

---

**Script B: "What about a missing receipt?"**

> *"Good question. Let me show you from the manager's side."*

Switch to Dashboard. Point to the flagged panel. Find Sneha's minibar charge (₹4,200, no receipt attached, flagged).

> *"Here's a four thousand two hundred rupee minibar charge. No receipt. The AI flagged it because it's above the five hundred rupee receipt threshold. Mihir has three options."*

Point to [Approve with Note], [Reject], [Ask Employee].

> *"If Mihir thinks it's fine, he approves with a note — that goes into the audit trail. If he wants the receipt, he clicks Ask Employee."*

Click [Ask Employee]. Modal appears with pre-drafted message: "Hi Sneha, could you upload the receipt for the minibar charge at The Lalit (₹4,200)? The policy requires receipts above ₹500."

> *"Pre-drafted message, policy-aware. One click to send."*

---

**Script C: "Try adding an expense"**

> *"Let me show you."*

In the chat screen, type: `I also had a ₹300 coffee at the airport`

Watch the streaming response: "Got it — ₹300 airport coffee. Categorized as Meals & Beverages (Incidentals). Within the daily meal limit. Added to your report. Updated total: ₹48,600."

> *"Categorized in real time using policy context. This is a live LLM call — not scripted. The AI knows the daily meal limit, knows what she's already spent today, and confirms it fits."*

**If they push further:** Type `Actually, make that ₹3,000 — it was a team coffee`. Watch the AI respond: "Updated to ₹3,000. That's above the individual meal threshold — I've re-categorized as Team Meals and flagged it for manager review since it's a new category for this trip. Want me to add the attendees?"

> *"Watch the re-categorization. It changed the category AND the approval routing because the amount changed the context. This is judgment, not rules."*

---

**Script D: "Is this actually calling an LLM?" (Skepticism Response)**

> *"Yes. Let me prove it."*

Type something unexpected that could not be pre-scripted: `My client gave me a ₹2,000 gift. How do I expense that?`

Watch the AI reason: "Gift from a client — that falls under the Gifts & Hospitality policy. Gifts received above ₹1,000 need to be declared to Compliance, not expensed. I can help you file the declaration instead. Want me to do that?"

> *"That response just came from Claude. It read the gift policy, determined this is a compliance issue not an expense issue, and changed the action entirely. You can't pre-script that kind of reasoning."*

---

### Demo Failure Protocols

**Scenario: API call hangs (>8 seconds, no streaming starts)**

Action: Refresh the page. The fallback system kicks in and loads pre-computed JSON instantly.

Narration: *"Let me refresh — sometimes the first call takes a moment."* Do NOT say "the API is down" or "let me switch to the backup." The fallback is invisible to the audience.

**Scenario: LLM returns garbage or hallucinated data**

Action: Say *"Interesting — let me reload with a fresh context."* Refresh. If fallback loads, continue normally. If it happens again, switch to a different scenario.

Narration: *"This is actually a great example of why evals matter in AI products — in production, this would trigger a confidence threshold check and route to a human. Let me show you a clean run."*

**Scenario: Page crashes or white screen**

Action: Have a second browser tab pre-loaded with the dashboard. Switch to it.

Narration: *"Let me switch views — I'll come back to the chat in a moment."* Show the dashboard demo (Steps 6-7), then try chat again in a new tab.

**Scenario: Internet goes down**

Action: The app should be deployable locally. Have `localhost:3000` running as backup.

Narration: Switch tabs to localhost silently. Say nothing about the switch.

**Pre-demo checklist (do this 10 minutes before the presentation):**
- [ ] Open prototype in Chrome. Load Mumbai scenario. Verify streaming works end-to-end.
- [ ] Open a second tab with Dashboard pre-loaded.
- [ ] Open a third tab with localhost:3000 as offline backup.
- [ ] Verify Ctrl+D shortcut works for auto-fill.
- [ ] Clear browser cache and cookies (avoid stale state).
- [ ] Set Do Not Disturb on laptop (no notification popups during demo).
- [ ] Font size: Cmd+Plus twice (ensure readability on projector/screen share).

---

