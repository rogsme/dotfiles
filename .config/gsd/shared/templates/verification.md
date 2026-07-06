---
phase: {NN}-{slug}
verified: {YYYY-MM-DDTHH:MM:SSZ}
status: {passed | gaps_found | human_needed}   # passed is ONLY valid when human_verification is empty
score: {N}/{M} must-haves verified
gaps: []                     # only if status: gaps_found — structured for /gsd-plan-phase --gaps:
#  - truth: "{observable truth that failed}"
#    status: failed          # failed | partial
#    reason: "{why it failed}"
#    artifacts:
#      - path: "{src/path/to/file}"
#        issue: "{what's wrong}"
#    missing:
#      - "{specific thing to add/fix}"
human_verification: []       # only if status: human_needed:
#  - test: "{what to do}"
#    expected: "{what should happen}"
#    why_human: "{why this can't be verified programmatically}"
---

# Phase {N}: {Name} Verification Report

**Phase Goal:** {goal restated from ROADMAP.md}
**Verified:** {timestamp}
**Status:** {status}

## Observable Truths

<!-- Do NOT trust SUMMARY claims — verify what actually exists in the code. -->

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | {truth} | {✓ VERIFIED / ✗ FAILED / ? UNCERTAIN} | {evidence} |

**Score:** {N}/{M} truths verified

## Required Artifacts

<!-- Three levels: exists (file present) → substantive (not a stub) → wired (actually used) -->

| Artifact | Exists | Substantive | Wired | Details |
|----------|--------|-------------|-------|---------|
| `{path}` | {✓/✗} | {✓/✗} | {✓/✗} | {details} |

## Key Links

| From | To | Via | Status |
|------|----|----|--------|
| {source} | {target} | {mechanism} | {WIRED / NOT_WIRED} |

## Gaps Summary

<!-- Only if gaps found: narrative of what's missing and why. Mirrors frontmatter gaps. -->

{narrative, or "None — all must-haves verified."}

## Human Verification Required

<!-- Only if status: human_needed. Mirrors frontmatter human_verification. -->

{numbered list of test / expected / why_human, or "None."}

---
*Verified: {timestamp}*
