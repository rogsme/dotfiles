---
status: in_progress          # in_progress | diagnosed | partial | complete
phase: {NN}-{slug}
source: [{list of SUMMARY.md files tests were extracted from}]
started: {ISO timestamp}
updated: {ISO timestamp}
---

## Current Test
<!-- OVERWRITE each test — shows where we are. "[testing complete]" when done. -->

number: {N}
name: {test name}
expected: |
  {what the user should observe}
awaiting: user response

## Tests

<!-- result vocabulary: pass | issue | skipped | blocked | [pending]
     severity (issues only, always inferred): blocker | major | minor | cosmetic
     verified_by (auto-verified passes only): playwright | curl | {tool} -->

### 1. {Test Name}
expected: {observable behavior}
result: [pending]

### 2. {Test Name}
expected: {observable behavior}
result: [pending]

<!-- On pass (auto):   result: pass / verified_by: {tool} + evidence summary
     On issue:         result: issue / reported: "{verbatim user response}" / severity: {inferred}
     On blocked:       result: blocked / blocked_by: {tag} / reason: "{verbatim}" -->

## Summary

total: {N}
passed: 0
issues: 0
pending: {N}
skipped: 0

## Gaps

<!-- Structured YAML for /gsd-plan-phase --gaps. Blocked tests do NOT go here
     (they are prerequisite gates, not code issues). "[none yet]" until an issue is found. -->

[none yet]
<!--
- truth: "{expected behavior from test}"
  status: failed
  reason: "User reported: {verbatim}"
  severity: {inferred}
  test: {N}
  root_cause: []  # optional, informational — filled by diagnosis
  artifacts: []   # filled by diagnosis
  missing: []     # actionable fixes — filled by diagnosis
-->
