# Sub-Plan: Hybrid Assembly Engine (Deterministic + AI)

> Status: IN PROGRESS — Building
> Parent: Phase 2 (Chat UI)
> Created: 2026-03-01 19:50 IST
> Updated: 2026-03-01 20:30 IST

## Final Architecture (Agreed)

```
┌─────────────────────────────────────┐
│  DATA (scenario JSON file)           │  ← Swappable. New trip = new file.
│  - transactions (card feed)          │
│  - context (calendar, CRM, email)    │
│  - policy rules                      │
└──────────────┬──────────────────────┘
               ▼
┌─────────────────────────────────────┐
│  DETERMINISTIC ENGINE (instant)      │
│  1. Fetch + normalize transactions   │
│  2. Join context (date/attendee)     │
│  3. Lookup policy limits             │
│  4. Compile matched evidence         │
└──────────────┬──────────────────────┘
               ▼
┌─────────────────────────────────────┐
│  AI — PER ITEM (Haiku, parallel)     │
│  For each transaction:               │
│    Input: transaction + matched      │
│           context + policy limits    │
│    Output: category, confidence,     │
│            reasoning text            │
│                                      │
│  7 parallel calls × ~1.5s each       │
│  Total: ~2s (parallel)               │
└──────────────┬──────────────────────┘
               ▼
┌─────────────────────────────────────┐
│  DETERMINISTIC (instant)             │
│  - Compile items into report         │
│  - Calculate totals                  │
│  - Determine recommendations         │
│    (confidence >= 95 → auto_approve) │
│  - Detect gaps (missing transport)   │
│  - Build summary stats               │
└──────────────┬──────────────────────┘
               ▼
           REPORT → UI
```

## What AI Does (per transaction)

Small prompt (~200 tokens input, ~100 tokens output):

```
Transaction: Dinner at Trishna, ₹8,500, Feb 25 2026
Payment: corporate card

Matched context:
- Calendar: "Client Dinner - Reliance Team" Feb 25, 19:00, attendees: Vikram Mehta
- CRM: Deal RLN-2026-Q1, ₹2Cr, Negotiation stage, Contact: Vikram Mehta (VP Procurement)
- Policy: Meal limit ₹5,000/day, Client entertainment limit ₹15,000/event

Categorize this expense. Return JSON:
{ "category": "...", "confidence": 0-100, "reasoning": "2-3 sentences" }
```

## What's Deterministic (no AI)

1. **Data fetching** — Supabase queries
2. **Context matching** — date/time overlap, attendee email join
3. **Policy lookup** — category → limit mapping
4. **Gap detection** — calendar locations vs transport transactions
5. **Recommendations** — rules (confidence + policy_status → action)
6. **Report compilation** — totals, summary, formatting

## P2: Data as Config (Future)

> Priority: P2 — after core demo works

Goal: Drop a new JSON file → engine processes it → new scenario works.

```
scenarios/
  mumbai-trip.json      ← current
  bangalore-trip.json   ← current
  london-trip.json      ← current
  custom-trip.json      ← user creates this, engine handles it
```

Each JSON file contains:
- traveler profile
- transactions array
- context (calendar, CRM, email, HRMS)
- No pre-computed categories/reasoning — AI generates those

The engine + AI pipeline handles any scenario file without code changes.

## Implementation Plan

### Step 1: Per-item AI prompt (new file)
- `src/lib/llm/prompts/categorize-item.ts`
- Small prompt: transaction + matched context → category + confidence + reasoning

### Step 2: Update assembler
- `src/lib/engine/assembler.ts`
- Deterministic: fetch, match, compile evidence per item
- Call AI for each item (parallel)
- Deterministic: compile report, recommendations, gaps

### Step 3: Update report router
- `src/server/routers/report.ts`
- Call assembler (which now includes AI calls internally)
- Fallback: if AI fails for an item, use template reasoning

### Step 4: Test
- Assembly completes in <5s (7 parallel Haiku calls)
- Dinner gets "Client Entertainment" with fresh reasoning each time
- Other items get correct categories with brief reasoning
