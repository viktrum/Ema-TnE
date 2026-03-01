# Dashboard UX Analysis — Mihir Desai (Manager)

> Three frameworks applied: JTBD, Lean UX Canvas, Customer Journey Map
> Goal: Determine the right experience pattern for the manager dashboard

---

## 1. Jobs-to-be-Done Analysis

### The Job

**When** I (Mihir) get a notification that expense reports are waiting for my review,
**I want to** quickly see what needs my attention, understand the AI's reasoning, and take action,
**So I can** clear my approval queue in under 2 minutes and get back to my real work.

### Forces Analysis

**Push (Problems with Current — Concur/SAP):**
- Rubber-stamp 90% of reports without reading (waste of time)
- No insight into WHY something was flagged — just "policy violation"
- Opening each report takes 3-4 clicks to see the details
- No way to trust the system's auto-approvals

**Pull (Attraction to AI-powered dashboard):**
- AI explains WHY something needs attention — I can make an informed decision in 10 seconds
- 81% auto-approved means I only see the 19% that actually need me
- One-click approve with reasoning visible — no drilling into forms
- Cross-system evidence (Calendar, CRM, Policy) gives me confidence

**Anxiety (Hesitations):**
- "What if the AI miscategorized something and I auto-approved it?"
- "Am I still adding value, or is the AI doing everything?"
- "What if I miss something because I trust the AI too much?"

**Habit (Inertia):**
- Current approval is email → open Concur → click through → rubber stamp
- Managers are used to NOT reading expense details
- "It works okay — nobody complains"

### Design for the Job

**Functional:** Show me ONLY what needs my decision. Everything else, just tell me it's handled.

**Emotional:** I want to feel like a smart manager — I see the AI's reasoning, agree with it, and approve. Not like a rubber stamp, but like a well-informed reviewer.

**Social:** When the CFO asks "how are expense approvals going?", I want data: "81% auto-approved, 19% I reviewed with AI reasoning, 96% policy compliance."

### Design Implications

1. **The dashboard is NOT a place to review 47 reports.** It's a place to act on 9 flagged items.
2. **Auto-approved reports are a confidence signal**, not something to review. Show them as a number, not a scrollable list.
3. **Each flagged item should be self-contained** — reasoning + evidence + action buttons. No drilling into sub-pages.
4. **The hero metric ("4 hours") is Mihir's social proof** — he shows this to his boss.

---

## 2. Lean UX Canvas

### Box 1: Business Problem
Managers spend 0-30 seconds per expense report, rubber-stamping without reading. When they do review, they lack context (why was this flagged? what's the policy? what happened on this trip?). This means flagged items either get blindly approved (risk) or sent back to the employee for clarification (friction + delay).

### Box 2: Business Outcomes
- Manager review time per flagged item: from 5 min → 30 seconds
- Flagged item resolution rate: from 60% same-day → 95% same-day
- False approval rate (auto-approved items that should have been flagged): <2%

### Box 3: Users
**Mihir Desai** — Engineering Manager, reviews 5-15 expense reports per week. Approves 80% in under 10 seconds. Flags 20% by gut feel, not evidence. Doesn't enjoy this part of his job.

### Box 4: User Outcomes & Benefits
- Save 45 minutes per week on expense approvals
- Feel confident in approvals (AI reasoning, not gut feel)
- Never miss a genuine policy violation
- Look good to finance/CHRO — compliance rate up

### Box 5: Solutions (3 options)

**Option A: 3-Panel Dashboard (current)**
- Left: auto-approved list, Center: flagged items, Right: stats
- Pros: shows everything at once, familiar pattern
- Cons: too much visual noise, auto-approved list is useless for the manager's job

**Option B: Inbox/Feed Pattern**
- Notification-style feed of flagged items only
- Each item expands in-place with reasoning + actions
- Stats as a compact header/summary bar
- Pros: focused, action-oriented, mobile-friendly
- Cons: doesn't show the "big picture" (81% auto-approved)

**Option C: Split View (Hero + Inbox)**
- Top: Hero banner ("4 hours" + key stats as compact chips)
- Below: Flagged items as an inbox/feed — each expandable
- Auto-approved count as a small indicator, not a full panel
- Pros: combines the hero moment with focused action, minimal noise
- Cons: might feel sparse

### Box 6: Hypotheses
1. We believe reducing manager review time to <30s per item will be achieved if Mihir attains confidence in AI reasoning with a focused inbox of flagged items (Option C).
2. We believe the "4 hours" hero metric will create the strongest demo impression if it's the FIRST thing visible, paired with key stats, before the action items.

### Box 7: Riskiest Assumption
**"Will the inbox pattern feel too simple for a demo?"** The panel might worry it's "just a list" and not impressive enough. The value is in the AI reasoning per item, not the dashboard layout.

### Box 8: Experiment
Show the 3 options side-by-side to the user (you) and decide based on the demo narrative: which pattern best supports the "4 hours" story?

---

## 3. Customer Journey Map — Mihir's Approval Flow

| Stage | Notification | Scan | Review | Decide | Act | Confirm |
|---|---|---|---|---|---|---|
| **Actions** | Gets email/toast that reports are ready | Opens dashboard, sees hero metric + flagged count | Expands a flagged item, reads AI reasoning | Agrees or disagrees with AI's recommendation | Clicks Approve/Reject/Ask | Sees confirmation, moves to next item |
| **Touchpoints** | Email, in-app toast, Tab 2 realtime update | Dashboard hero banner, stats bar | Flagged item card, reasoning panel, source badges | Action buttons (Approve/Reject/Ask) | Modal (for reject/ask), one-click (for approve) | Toast notification, count update |
| **Experience** | "Something needs my attention" | "Wow, 81% already handled. Only 9 items for me." | "This is smart — the AI cross-referenced Calendar + CRM + Policy." | "I agree, this dinner IS client entertainment." | "One click, done." | "That was fast. Next." |
| **Emotion** | Neutral → mild obligation | Impressed → relieved | Curious → trusting | Confident → decisive | Satisfied | "Why can't all approvals be like this?" |
| **Pain Points** | Too many notifications | If everything looks the same, nothing stands out | If reasoning is a wall of text, I won't read it | If I'm not sure, I need to ask the employee | If modals are clunky, it kills the flow | If no feedback, I don't know if it worked |
| **KPIs** | Notification open rate | Time to first action | Time spent reading reasoning | Decision confidence (approve vs ask) | Action completion rate | Items per session |

### Key Insights from Journey Map

1. **The "Scan" stage is the hero moment for the DEMO** — Mihir sees "4 hours" and "81% auto-approved" and is immediately impressed. This must be instant and prominent.

2. **The "Review" stage is the hero moment for the PRODUCT** — Mihir reads the AI reasoning and trusts it. This is where the 3-source evidence (Calendar + CRM + Policy) shines. It must be clean, not a paragraph.

3. **The "Act" stage must be frictionless** — One click for approve, minimal modal for reject/ask. No multi-step forms.

4. **The "Confirm" stage is emotional** — The toast notification + count update gives Mihir the dopamine hit of "I'm efficient." The realtime sync (Tanya gets notified) shows the system is alive.

5. **The auto-approved list is IRRELEVANT to Mihir's journey** — He never looks at it. It's a stat, not a panel.

---

## Recommendation: Option C (Split View)

Based on all three frameworks:

```
┌──────────────────────────────────────────────────────┐
│  HERO BANNER                                          │
│  "4 hours" (48px) + "Trip-end to submitted"          │
│  + Compact stat chips: 47 reports | 81% auto | 93%   │
│    confidence | 96% compliance                        │
└──────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────┐
│  FLAGGED ITEMS — Needs Your Review (9)                │
│                                                        │
│  ┌────────────────────────────────────────────────┐  │
│  │ ★ Tanya Sharma — Dinner at Trishna ₹8,500     │  │
│  │   Re-categorized: Restaurants → Client Ent.    │  │
│  │                                                 │  │
│  │   [Calendar] Client Dinner with Vikram Mehta    │  │
│  │   [CRM] Deal RLN-2026-Q1, ₹2Cr, Negotiation   │  │
│  │   [Policy] ₹15K client entertainment limit      │  │
│  │                                                 │  │
│  │   [Approve ✓]  [Reject ✗]  [Ask Employee 💬]   │  │
│  └────────────────────────────────────────────────┘  │
│                                                        │
│  ┌────────────────────────────────────────────────┐  │
│  │ Rahul Menon — Duplicate Uber ₹420       MEDIUM │  │
│  │   Potential duplicate — identical charges...     │  │
│  │   [▼ Expand]                                    │  │
│  └────────────────────────────────────────────────┘  │
│                                                        │
│  ┌────────────────────────────────────────────────┐  │
│  │ Anita Desai — Missing Receipt ₹14,200    HIGH  │  │
│  │   Receipt missing for expense exceeding ₹5K...  │  │
│  │   [▼ Expand]                                    │  │
│  └────────────────────────────────────────────────┘  │
│  ... (6 more collapsed)                               │
└──────────────────────────────────────────────────────┘
```

### Why Option C wins:

| Criteria | Option A (3-panel) | Option B (Inbox) | Option C (Split) |
|---|---|---|---|
| JTBD: Focused on the job | ❌ Shows 47 reports (noise) | ✅ Only flagged | ✅ Only flagged + hero |
| Demo impact | Medium (busy) | Low (too simple) | **High** (hero + action) |
| Lean UX: Manager review <30s | Medium | ✅ Fast | ✅ Fast |
| Journey: Scan → Review → Act | Scan is buried | No scan moment | **Scan (hero) → Review (inbox) → Act** |
| Mobile/responsive | ❌ 3 columns | ✅ Single column | ✅ Single column |
| Shows AI intelligence | Diluted across panels | ✅ Per item | ✅ Per item with hero context |

### What to remove from current design:
- The auto-approved scrollable list (left panel) → becomes a chip in the hero banner
- The full stats panel (right panel) → becomes compact chips in the hero banner
- The 3-column grid → becomes a single-column inbox below the hero

### What to keep:
- Hero banner with "4 hours"
- Flagged items with expand/collapse
- Approve/Reject/Ask action buttons
- Realtime subscriptions
- Source badges (Calendar, CRM, Policy) in reasoning
