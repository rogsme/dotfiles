---
status: {planning | executing | verifying | phase_complete | milestone_complete}
progress:
  total_phases: {N}
  completed_phases: {N}
  total_plans: {N}
  completed_plans: {N}
  percent: {N}
---

# Project State

<!-- Hard cap: 100 lines. This is a digest, not an archive.
     Disk artifacts (SUMMARY/VERIFICATION files) are truth; when STATE disagrees, disk wins. -->

## Project Reference

See: .planning/PROJECT.md (updated {date})

**Core value:** {one-liner from PROJECT.md Core Value}
**Current focus:** {current phase name}

## Current Position

Phase: {X} of {Y} ({phase name})
Plan: {A} of {B} in current phase
Status: {Ready to plan / Planning / Ready to execute / In progress / Phase complete}
Last activity: {YYYY-MM-DD} — {what happened}

Progress: {░░░░░░░░░░} {N}%

## Accumulated Context

### Recent Decisions

<!-- 3-5 most recent; full log lives in PROJECT.md Key Decisions -->

- {Phase X}: {decision summary}

### Active Blockers

<!-- Only unresolved items; remove when addressed -->

None.

## Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| - | - | - | - | - |

## Session Continuity

Last session: {YYYY-MM-DD HH:MM}
Stopped at: {last completed action}
Next: {what to do next, e.g. "/gsd-plan-phase 3"}
