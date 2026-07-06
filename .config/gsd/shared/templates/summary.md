---
phase: {NN}-{slug}
plan: {PP}
status: complete             # complete | partial | blocked
one_liner: "{substantive outcome — what actually shipped, never 'phase complete'}"
key-files:
  created: []                # important files created
  modified: []               # important files modified
duration: {X}min
completed: {YYYY-MM-DD}
---

# Phase {N}: {Name} Summary ({NN}-{PP})

**{One-liner repeated: substantive description of what shipped}**

## Accomplishments

- {most important outcome}
- {second key accomplishment}

## Task Commits

<!-- One row per task; commit type per conventions.md §5 -->

| Task | Commit | Type |
|------|--------|------|
| Task 1: {name} | {abc123f} | {feat/fix/test/refactor} |

## Deviations from Plan

<!-- "None - plan executed exactly as written", or per deviation:
     what was wrong, what was done, files touched, which commit. -->

None - plan executed exactly as written.

## Self-Check: {PASSED | FAILED}

<!-- Executor verifies its own claims before returning: created files exist,
     commits exist, verify commands passed. List missing items if FAILED. -->

---
*Phase: {NN}-{slug}*
*Completed: {YYYY-MM-DD}*
