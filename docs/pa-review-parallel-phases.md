# Principal Architect Review: Phase 4/5/6 Parallel Execution
> 2026-03-02 05:30 IST — Reference document for all parallel phase sessions

## Merge Order (NON-NEGOTIABLE)
```
Phase 4 (feature/phase-4-scenarios) → merge to develop FIRST
Phase 5 (feature/phase-5-polish)    → rebase on develop, merge SECOND
Phase 6 (feature/phase-6-evals)     → rebase on develop, merge THIRD
```

## File Ownership Matrix

| File | Phase 4 | Phase 5 | Phase 6 | Notes |
|------|---------|---------|---------|-------|
| `src/app/chat/page.tsx` | OWNS (edit flows, reasoning, Ctrl+D) | MODIFIES (splash, loading steps) | NO TOUCH | Phase 5 rebases after Phase 4 merges |
| `src/app/page.tsx` | OWNS (scenario selector) | NO TOUCH | NO TOUCH | |
| `src/server/routers/report.ts` | NO TOUCH | OWNS (submit mapper fix) | NO TOUCH | |
| `src/server/routers/categorize.ts` | CREATES (new file) | NO TOUCH | NO TOUCH | Must be NEW file, not in report.ts |
| `src/components/chat/MessageBubble.tsx` | NO TOUCH | OWNS (markdown renderer) | NO TOUCH | |
| `src/lib/supabase/client.ts` | NO TOUCH | MODIFIES (worker: true) | NO TOUCH | |
| `supabase/seed.sql` | APPENDS (Bangalore) | APPENDS (London, optional) | NO TOUCH | Both append at END only |
| `evals/*` | NO TOUCH | NO TOUCH | OWNS | |
| `src/lib/llm/prompts/chat.ts` | NO TOUCH | NO TOUCH | NO TOUCH | Hardened in Phase 3.8 |
| `src/lib/utils/parseLLMResponse.ts` | NO TOUCH | NO TOUCH | NO TOUCH | Stable utility |
| `prototype/spec/demo/demo-script.md` | NO TOUCH | NO TOUCH | OWNS | |

## Conflict Predictions

| When | File | Severity | Resolution |
|------|------|----------|------------|
| Phase 5 merges after Phase 4 | `src/app/chat/page.tsx` | HIGH (~30 min) | Phase 4 adds edit components + reasoning. Phase 5 adds splash overlay + loading steps. Different sections but same component — manual merge of imports, state vars, JSX. |
| Phase 5 merges after Phase 4 | `supabase/seed.sql` | LOW (trivial) | Both append at end. Keep both blocks. |
| Phase 6 merges after both | No conflicts | NONE | Only touches `evals/` and docs |

## Critical Rules for All Phases

1. **Never modify files owned by another phase** — check the ownership matrix above
2. **`seed.sql` is append-only** — add new data at the END, never modify existing rows
3. **`chat.ts` prompt is frozen** — hardened in Phase 3.8, do not change
4. **`parseLLMResponse.ts` is frozen** — shared utility, stable
5. **New tRPC routers go in NEW files** — register in `_app.ts` but don't add to existing router files owned by other phases
6. **Conventional commits required** — `feat(phase-N): description`
7. **Code review threshold: 75** — run `code-review:code-review` skill on every PR
8. **Supabase Cloud has no service role key** — seed data via SQL editor if RLS blocks INSERTs

## Phase 6 Two-Stage Execution

Phase 6 has NO code dependencies on Phases 4/5 for Stage 1 (authoring evals, writing scripts). But Stage 2 (running gate tests, demo rehearsal) REQUIRES both Phases 4 and 5 to be merged first.

```
Stage 1 (parallel-safe): Author evals, write pre-demo checklist script, prep deploy
Stage 2 (after 4+5 merge): Rebase on develop, run G6-01/02/03, demo rehearsal
```

## Gotchas from Memory

- Import from `zod/v4` (not `zod`)
- `@/*` alias maps to `./src/*`
- LLM returns JSON wrapped in markdown fences — `parseLLMResponse.ts` handles this
- `MessageBubble` uses `dangerouslySetInnerHTML` — any HTML rendering must be sanitized
- Supabase realtime respects RLS — events silently dropped if no SELECT policy
- `worker: true` on Supabase client prevents background tab disconnections (Phase 5 implements)
- Two browsers required for side-by-side demo (same browser shares cookies)
- LLM `update_amount` sends currency symbols — strip with `replace(/[^0-9.]/g, '')` before `Number()`
