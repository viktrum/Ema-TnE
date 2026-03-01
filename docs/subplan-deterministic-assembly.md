# Sub-Plan: Deterministic Assembly Engine

> Status: DRAFT — Discussion phase
> Parent: Phase 2 (Chat UI) / extends into Phase 4 (Depth)
> Created: 2026-03-01 19:50 IST

## Problem

The current assembly prompt sends ALL scenario data to Claude and asks it to do 7 tasks:
1. Match transactions to context sources
2. Categorize each transaction
3. Score confidence
4. Detect gaps
5. Cite systems
6. Recommend actions
7. Generate reasoning text

This is slow (~10-15s for Sonnet, ~5-8s for Haiku), expensive, and unreliable (timeout failures, schema mismatches). Only task 7 actually needs an LLM.

## Proposed Architecture

```
┌──────────────────────────────────────────────────────┐
│                 DETERMINISTIC ENGINE                   │
│                 (TypeScript, instant)                   │
│                                                        │
│  Input: scenario (transactions + context + policy)     │
│                                                        │
│  Step 1: MATCH — join transactions to context          │
│    - Date/time overlap with calendar events             │
│    - Attendee matching (email → CRM contact)            │
│    - Vendor → email confirmation matching               │
│    - Location proximity for gap detection               │
│                                                        │
│  Step 2: CATEGORIZE — rules engine                     │
│    - Merchant category → expense category mapping       │
│    - Re-categorization rules:                           │
│      IF meal + calendar_has_client + CRM_has_deal       │
│      THEN Personal Meal → Client Entertainment          │
│    - Policy limit lookup per category                   │
│                                                        │
│  Step 3: SCORE — confidence formula                    │
│    - Base: 60%                                          │
│    - +15% per matching source (card, calendar, CRM,     │
│      email, policy)                                     │
│    - -20% if no receipt AND amount > threshold          │
│    - Cap at 98%                                         │
│                                                        │
│  Step 4: DETECT GAPS                                   │
│    - For each calendar event with location:              │
│      Check if transport transaction exists within ±2hrs │
│      If not → flag as gap, estimate from distance       │
│                                                        │
│  Step 5: RECOMMEND                                     │
│    - confidence >= 95 + within_policy → auto_approve    │
│    - re-categorized → approve_with_review               │
│    - no receipt + high amount → flag_for_review         │
│    - gap → request_employee_input                       │
│                                                        │
│  Output: Complete report skeleton (no reasoning text)   │
└──────────────────────┬───────────────────────────────┘
                       │
                       ▼
          ┌─ UI renders table IMMEDIATELY ─┐
          │  (user sees data in <500ms)     │
          └────────────┬───────────────────┘
                       │
                       ▼ (async, non-blocking)
┌──────────────────────────────────────────────────────┐
│              LLM REASONING (Haiku, async)              │
│                                                        │
│  For EACH flagged/re-categorized item only:            │
│                                                        │
│  Prompt: "This dinner at Trishna (₹8,500) was          │
│  re-categorized from Personal Meal to Client            │
│  Entertainment. Evidence: Calendar shows client dinner  │
│  with Vikram Mehta (Reliance), CRM shows ₹2Cr deal.   │
│  Policy limit: ₹15K for client entertainment.          │
│  Write a 2-3 sentence reasoning explanation."           │
│                                                        │
│  → Much smaller prompt (~200 tokens vs ~6000)           │
│  → Only called for 1-2 items, not all 7                 │
│  → Streams into the reasoning panel as it generates     │
│                                                        │
│  Fallback: Template-based reasoning if LLM fails        │
│    "Re-categorized based on Calendar (client dinner)    │
│     and CRM (active deal ₹2Cr). Within ₹15K limit."   │
└──────────────────────────────────────────────────────┘
```

## Files to Create/Modify

### New Files
| File | Purpose |
|---|---|
| `src/lib/engine/assembler.ts` | Main orchestrator — calls matcher, categorizer, scorer |
| `src/lib/engine/matcher.ts` | Transaction ↔ context matching (date, attendee, vendor) |
| `src/lib/engine/categorizer.ts` | Rules-based categorization + re-categorization |
| `src/lib/engine/confidence.ts` | Confidence scoring formula |
| `src/lib/engine/gap-detector.ts` | Missing transaction detection |
| `src/lib/engine/recommender.ts` | Action recommendation rules |
| `src/lib/engine/types.ts` | Shared types for the engine |

### Modified Files
| File | Change |
|---|---|
| `src/server/routers/report.ts` | Replace LLM assembly with deterministic engine + async reasoning |
| `src/app/chat/page.tsx` | Show table immediately, stream reasoning after |
| `src/lib/llm/prompts/assembly.ts` | Replace with small per-item reasoning prompt |

## UX Flow Change

### Current (slow)
```
Login → Loading... (8-30s) → Table + Reasoning all at once
```

### Proposed (fast)
```
Login → Table appears (<500ms) → Reasoning streams in (2-3s per item)
```

The user sees the expense table IMMEDIATELY. Reasoning panels show a loading shimmer, then fill in as the LLM responds. This is a much better experience.

## What the LLM Still Does

1. **Reasoning text** for flagged/re-categorized items (1-2 items per report)
2. **Chat responses** (conversational, streaming)
3. **Categorization disputes** (Phase 4 — when user edits category and AI disagrees)

## What Becomes Deterministic

1. Transaction → context matching
2. Category assignment (rules + merchant code mapping)
3. Confidence scoring
4. Gap detection
5. Action recommendations
6. Report totals and summary stats

## Risks & Trade-offs

| Risk | Mitigation |
|---|---|
| Rules engine won't handle edge cases | Template fallback reasoning covers 90% of cases |
| Dinner re-categorization is the hero moment — must be convincing | The matching logic is deterministic but the EXPLANATION is LLM-generated |
| More code to maintain | But it's testable, fast, and reliable |
| LLM reasoning may not match deterministic categorization | Pass the deterministic result TO the LLM as context |

## Effort Estimate

- Deterministic engine: ~1-2 hours (7 small files, pure logic)
- Prompt rewrite: ~30 min
- Chat page update (async rendering): ~30 min
- Testing: ~30 min

Total: ~3 hours — fits within Phase 2 remaining time or can be Phase 2.5

## Decision Points

1. **Do we build the full engine now, or just for Mumbai scenario?**
   - Mumbai-only is faster but less impressive if panelists try Bangalore/London
   - Full engine works for all scenarios

2. **Do we show reasoning shimmer or just "Why?" expand button?**
   - Shimmer = more polished, shows AI is working
   - Expand button = simpler, reasoning loads on demand

3. **Where does this sit in the phase plan?**
   - Option A: Part of Phase 2 (before merge)
   - Option B: New Phase 2.5 (separate branch/PR)
   - Option C: Part of Phase 4 (Depth)
