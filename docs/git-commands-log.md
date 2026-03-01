# Git Commands Log

Sequential log of every git command run during this build, with explanations.

---

## Phase 1: Foundation

### 1. Create feature branch
```bash
git checkout develop
git checkout -b feature/phase-1-foundation
```
**Why:** Start from `develop` (integration branch). Create a new feature branch for Phase 1 work. All work happens on feature branches, never directly on `develop` or `main`.

### 2. First commit — foundation code
```bash
git add src/lib/llm/ src/server/schemas/ src/server/routers/scenario.ts ...
git commit -m "feat(phase-1): foundation — schema, auth, LLM client, tRPC core, seed data"
```
**Why:** Stage specific files (not `git add .` to avoid accidentally committing secrets or unnecessary files). Commit with conventional commit format (`feat(scope): description`).

### 3. Push branch + create PR
```bash
git push -u origin feature/phase-1-foundation
gh pr create --base develop --title "..." --body "..."
```
**Why:** `-u` sets the upstream tracking branch so future `git push` knows where to push. `gh pr create --base develop` creates a PR targeting the `develop` branch (not `main`).

### 4. Fix code review issues + push
```bash
git add src/server/routers/report.ts src/lib/llm/structured-output.ts ...
git commit -m "fix(phase-1): address code review findings — schema mismatches, type safety"
git push
```
**Why:** After code review found bugs, fix them in a new commit (not amend — preserves history). `git push` works without `-u` now because upstream is already set.

### 5. Fix migration ordering + push
```bash
git add supabase/migrations/001_initial_schema.sql src/app/globals.css
git commit -m "fix(phase-1): move get_user_role() after users table, add missing CSS tokens"
git push
```
**Why:** The SQL function referenced a table that didn't exist yet. Fix the ordering, commit, push to update the PR.

### 6. Add evaluation doc + push
```bash
git add docs/code-review-evaluation.md
git commit -m "docs(phase-1): add code review evaluation tracking for PR #1"
git push
```
**Why:** Track code review tool findings for the evaluation track.

### 7. Post code review comment on PR
```bash
gh pr comment 1 --body "### Code review ..."
```
**Why:** Post the code review findings directly on the PR so they're visible on GitHub.

---

## Transition: Phase 1 → Phase 2

### 8. Stash local changes, merge to develop, create Phase 2 branch
```bash
git stash                                    # Save uncommitted changes temporarily
git checkout develop                         # Switch to develop branch
git merge feature/phase-1-foundation --no-edit  # Fast-forward merge Phase 1 into develop
git checkout -b feature/phase-2-chat-ui      # Create Phase 2 branch from updated develop
```
**Why:**
- `git stash` — saves dirty files (stores, settings) so we can switch branches cleanly
- `git checkout develop` — switch to integration branch
- `git merge` — brings all Phase 1 commits into develop. `--no-edit` accepts the default merge message
- `git checkout -b` — start Phase 2 from the latest develop (which now includes Phase 1)

### 9. Restore stashed changes
```bash
git checkout -- .claude/settings.local.json  # Discard conflicting local change
git stash pop                                # Restore the stashed files
```
**Why:** The stash had a conflict with one file. We discard the local version of that file, then pop the rest of the stash to get our untracked files back (like `src/stores/`).

---

## Git Workflow Summary

```
main (production)
└── develop (integration)
    ├── feature/phase-1-foundation  ──→ PR #1 ──→ merged to develop ✅
    ├── feature/phase-2-chat-ui     ──→ PR #2 ──→ (in progress)
    ├── feature/phase-3-dashboard   ──→ PR #3
    └── ...
```

**Key rules:**
- Never commit directly to `main` or `develop`
- Feature branches branch FROM and merge TO `develop`
- Conventional commits: `feat(scope):`, `fix(scope):`, `docs(scope):`, `chore(scope):`
- Each phase = 1 feature branch = 1 PR
- Code review before merge
- `develop` → staging, `main` → production
