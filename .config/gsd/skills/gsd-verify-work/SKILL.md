---
name: gsd-verify-work
description: Validates built features through conversational UAT — the user tests, the skill records. Use when the user says "verify phase 3", "verify work", "UAT", "test what we built", or "check the phase works". Supports --auto for automated smoke verification via playwright-cli and curl before the interactive loop. Extracts user-observable tests from phase summaries, tracks results in {NN}-UAT.md, and diagnoses any gaps found.
argument-hint: "<phase> [--auto]"
---

Read $HOME/.config/gsd/shared/conventions.md before doing anything — it defines project-root discovery, the .planning/ tree, commit conventions, config keys, and status vocabularies.

# Verify Work (UAT)

Validate built features through conversational testing with persistent state. Creates
`{NN}-UAT.md` that tracks test progress, survives context resets, and feeds gaps into
`/gsd-plan-phase N --gaps`.

**Philosophy: show expected, ask if reality matches.** Present what SHOULD happen; the
user confirms or describes what's different. No pass/fail buttons, no severity
interrogation.

## 1. Session handling

Discover the project root per conventions. Read `.planning/config.json` for
`planning.commit_docs` (default true — when false, never stage `.planning/` files).

Scan for active sessions:

```bash
grep -l -E '^status: (in_progress|diagnosed)' .planning/phases/*/*-UAT.md 2>/dev/null
```

- **Active session(s), no phase argument:** read each file's frontmatter and Current
  Test; show a table (Phase | Status | Current Test | Progress) and ask: resume one
  (by number) or start a new phase. On resume, announce progress so far and go to §5
  at the first `[pending]` test.
- **Active session for the given phase:** offer resume or restart (restart overwrites).
- **No active session, no argument:** ask for a phase number and stop.
- **Otherwise:** continue to §2 with the given phase.

Resolve `{phase_dir}` = `.planning/phases/{NN}-{slug}/` and `{NN}` per conventions §3.
If the directory or its `*-SUMMARY.md` files don't exist, tell the user the phase has
not been executed yet and suggest `/gsd-execute-phase N`.

## 2. Extract tests from summaries

Read every `{phase_dir}/{NN}-*-SUMMARY.md`. Parse accomplishments and user-facing
changes. Focus on USER-OBSERVABLE outcomes, not implementation details — skip internal
refactors, type changes, config shuffles.

For each deliverable, create a test with a brief **name** and an **expected** — what
the user should see/experience, specific and observable. Example: "Added comment
threading with infinite nesting" → test "Reply to a Comment", expected "Clicking Reply
opens an inline composer below the comment. Submitting shows the reply nested under
its parent with visual indentation."

**Cold-start smoke test injection.** After extracting tests, scan the SUMMARY files for
modified/created file paths. If ANY path matches:

`server.ts`, `server.js`, `app.ts`, `app.js`, `index.ts`, `index.js`, `main.ts`,
`main.js`, `database/*`, `db/*`, `seed/*`, `seeds/*`, `migrations/*`, `startup*`,
`docker-compose*`, `Dockerfile*`

then **prepend** this test to the list:

- name: "Cold Start Smoke Test"
- expected: "Kill any running server/service. Clear ephemeral state (temp DBs, caches,
  lock files). Start the application from scratch. Server boots without errors, any
  seed/migration completes, and a primary query (health check, homepage load, or basic
  API call) returns live data."

This catches bugs that only manifest on fresh start — startup race conditions, silent
seed failures, missing environment setup — which pass against warm state but break in
production.

## 3. Create the UAT file

Create `{phase_dir}/{NN}-UAT.md` per `$HOME/.config/gsd/shared/templates/uat.md`:

```markdown
---
status: in_progress
phase: {NN}-{slug}
source: [list of SUMMARY.md files]
started: {ISO timestamp}
updated: {ISO timestamp}
---

## Current Test
number: 1
name: {first test name}
expected: |
  {what the user should observe}
awaiting: user response

## Tests
### 1. {Test Name}
expected: {observable behavior}
result: [pending]
...

## Summary
total: {N} / passed: 0 / issues: 0 / pending: {N} / skipped: 0

## Gaps
[none yet]
```

**If `--auto` is present:** proceed to §4. **Otherwise:** proceed to §5.

## 4. Auto-verify (`--auto` only)

Skip this entire section when `--auto` is absent — all tests then go through the
interactive loop in §5 unchanged.

**Invariants: use `playwright-cli` and `curl` ONLY. NEVER use Playwright MCP tools.**
Every result written here is confidence-classified — when in doubt, leave the test
`[pending]` for the human.

### 4a. Check playwright-cli availability

```bash
command -v playwright-cli >/dev/null 2>&1 && echo "playwright-cli:available" || echo "playwright-cli:missing"
```

If missing and there are UI-related tests, tell the user: "playwright-cli is not
installed — {N} UI tests will require manual testing. To enable automated UI
verification: `npm install -g @playwright/cli@latest` then
`playwright-cli install --skills` (or run via `npx playwright-cli`)."

Ask (options + freeform): continue with curl-only auto-verify (UI tests go interactive),
continue fully interactive, or cancel so they can install and re-run with `--auto`.

### 4b. Detect base URL

Suggest a default by checking `.env` files, `.planning/PROJECT.md`,
`docker-compose.yml`, and `package.json` scripts for common patterns (localhost ports,
API URLs). Ask the user to confirm the detected URL or provide another
(offer `http://localhost:3000` / `http://localhost:8000` as fallbacks).

### 4c. Ping the URL

```bash
curl -s -o /dev/null -w "%{http_code}" --max-time 5 "{BASE_URL}"
```

If no response or non-2xx/3xx, report "Application not reachable at {BASE_URL}
(status: {code})" and ask: "I started it, retry" / "Skip auto-verify" / "Use a
different URL". On skip, go to §5 with all tests still pending.

### 4d. Auth discovery

**For curl candidates:** check `.env`, test fixtures, and seed scripts for test tokens,
API keys, or auth headers. If no obvious bypass found, ask: Bearer token (user supplies
value) / API key (name + value) / skip authenticated endpoints (those go interactive).

**For playwright candidates:** check `.env`, seed scripts, and fixture files for test
user credentials or dev bypass flags. If none found, ask: provide login credentials
(whatever fields the form needs) / skip authenticated pages (those go interactive).

During playwright execution: if an unexpected login form or auth wall appears that was
not anticipated, **pause and ask the user** for the field values before continuing.

### 4e. Classify tests

For each `[pending]` test, classify:

| Test references | Classification | Tool |
|-----------------|---------------|------|
| Page, route, component, visual appearance, user flow | playwright candidate | playwright-cli |
| API endpoint, response, status code, data | curl candidate | curl |
| Form submission → API response | playwright candidate | playwright-cli (covers both) |
| Performance feel, subjective UX, "does it feel right" | interactive | none |
| WebSocket/SSE real-time behavior | interactive | none |

If playwright-cli is unavailable, all playwright candidates become interactive.
Show the resulting classification table to the user before running anything.

### 4f. Playwright smoke checks

For each playwright candidate, use `playwright-cli` with a **visible browser** (run
`playwright-cli show` after launching) so the user can watch progress:

- Navigate to the page/route
- Verify the page loads without console errors
- Verify key elements are visible (derived from the test's expected behavior)
- Basic click navigation if the test involves it
- If credentials were provided in 4d, fill the login form first

### 4g. Curl checks

For each curl candidate:

- **Reachability + status code:**
  `curl -s -w "\n%{http_code}" -X {METHOD} "{BASE_URL}{endpoint}" -H "Content-Type: application/json" {AUTH_HEADER} --max-time 10`
  — verify the status matches expected (200 GET, 201 POST, etc.)
- **Response shape:** parse the JSON; verify expected keys from the plan/summary/schema.
- **CRUD (when the test involves create/update/delete):** POST creates a test resource
  (expect 201 + shape); GET retrieves it by ID; PUT/PATCH updates a field and verifies
  the change; DELETE removes it (expect 204/200, then GET → 404). **Always clean up:**
  if create succeeded but a later step fails, delete the created resource.
- **Error handling:** one invalid payload (missing required field) expecting 400/422;
  one non-existent ID expecting 404.

### 4h. Confidence rules (both tools)

- **PASS** → write `result: pass` plus `verified_by: playwright` or `verified_by: curl`
  with a one-line evidence summary.
- **High-confidence FAIL** (wrong status code, 4xx/5xx page, expected element not found
  after load, 500 error, missing expected keys, feature-related console errors) →
  write `result: issue`, `reported: "Auto-verify failed: {reason}"`, infer severity,
  and append to the Gaps section (format in §5).
- **Low-confidence FAIL** (timeout, flaky selector, intermittent network issue,
  unexpected redirect, connection reset, ambiguous outcome) → leave `result: [pending]`
  so it goes to the interactive loop. Never record an issue you aren't sure of.

Every auto-verified test gets a `verified_by:` annotation. Update the UAT file directly
as results land.

### 4i. Report and continue

Update Summary counts, then display: "AUTO-VERIFY — Phase {N}: auto-verified {n}/{total}
tests — passed {n} (playwright: {a}, curl: {b}), issues {n}, remaining {n} (manual)."

If all tests are resolved, go to §6. Otherwise fall through to §5 — the loop naturally
presents only `[pending]` tests.

## 5. Interactive loop

For each `[pending]` test, present exactly one test: its number, name, and the expected
behavior in plain words, ending with "Does it work that way?" Wait for the user's
freeform reply. Then interpret:

- **Pass:** empty, "yes", "y", "ok", "pass", "next", "approved" → `result: pass`
- **Skip:** "skip", "can't test", "n/a" → `result: skipped`, plus `reason:` if given
- **Blocked:** mentions of server not running, physical device, release build,
  third-party config, prior-phase dependency → `result: blocked` with an inferred
  `blocked_by:` tag (`server` | `physical-device` | `release-build` | `third-party` |
  `prior-phase` | `other`) and `reason: "{verbatim user response}"`. Blocked tests do
  NOT go into Gaps — they are prerequisite gates, not code issues.
- **Anything else is an issue.** `result: issue`, `reported: "{verbatim response}"`,
  `severity: {inferred}`. Severity is INFERRED, never asked: crash/error/exception/
  broken → `blocker`; doesn't work/wrong/missing/can't → `major`; slow/weird/minor →
  `minor`; color/font/spacing/alignment → `cosmetic`; default `major`.

  Also append to Gaps (structured YAML consumed by `/gsd-plan-phase --gaps`):

  ```yaml
  - truth: "{expected behavior from test}"
    status: failed
    reason: "User reported: {verbatim user response}"
    severity: {inferred}
    test: {N}
    root_cause: []  # informational — filled by diagnosis
    artifacts: []   # filled by diagnosis
    missing: []     # actionable fixes — filled by diagnosis; the planner consumes this
  ```

**Batched writes:** keep results in memory; write the UAT file on every issue
(immediately), every 5 passes (checkpoint), and at completion. Each write updates
Current Test, the test results, Summary counts, and `updated:` in frontmatter. On
context reset the file shows the last checkpoint — resume from there.

## 6. Completion

When no `[pending]` tests remain (or the user stops early):

- status `complete` if every test has a definitive result (pass, issue, or
  skipped-with-reason); otherwise `partial`.
- Clear Current Test to `[testing complete]`, update frontmatter.
- Commit (respecting `planning.commit_docs`):
  `test({NN}): complete UAT — {p} passed, {i} issues`
- Present a summary table (Passed / Issues / Skipped / Blocked) and list any issues.

**Security surface:** if `{phase_dir}/{NN}-SECURITY.md` exists, read its frontmatter
`threats_open`. If > 0, add to the summary: "Security: {n} open threats — this will
block /gsd-ship {N}."

**Open-items check (inline, this phase only):** if `{NN}-VERIFICATION.md` has status
`human_needed` or `gaps_found`, note its outstanding human-verification items; if
`{NN}-CONTEXT.md` has entries under its `## Open Questions` section, note them. List
anything found in the summary. Informational, not a gate.

**If issues > 0:** proceed to §7.

**If issues == 0 and `{NN}-VERIFICATION.md` has status `human_needed`:** this skill
owns human verification — the human just did it. Mark the phase complete: update
`{NN}-VERIFICATION.md` frontmatter to `status: passed` and add
`human_verified: {YYYY-MM-DD}`, tick the phase checkbox in ROADMAP.md, update STATE.md
(current position, progress, session continuity) and PROJECT.md current state, and
commit `docs({NN}): complete phase {N} after UAT` (respecting `planning.commit_docs`).
Updating the VERIFICATION frontmatter is what closes the human_needed loop —
gsd-ship, gsd-progress, and gsd-milestone all read it to see the phase as verified.

## 7. Gap diagnosis (when issues exist)

Announce: "{N} issues found. Diagnosing root causes..." Then spawn parallel diagnose
subagents — one per gap, all launched in a single message per conventions §9. Each
prompt:

```
Read $HOME/.claude/skills/gsd-verify-work/references/diagnose-prompt.md and follow it.

Gap:
- truth: {expected behavior}
- reported: {verbatim user report or auto-verify failure}
- severity: {severity}

Relevant paths:
- {phase_dir}/{NN}-{PP}-SUMMARY.md (what was built and where)
- {source files named in the summaries relevant to this gap}

Find the ROOT CAUSE ONLY. Do not fix anything. Return your findings as text.
```

Subagents return root causes as text (they write no files). Write each finding back
into the matching Gaps entry in UAT.md: the ROOT CAUSE into `root_cause:`
(informational), the evidence files into `artifacts:`, and the FIX DIRECTION into
`missing:` as concrete missing behaviors/fixes. `missing:` MUST end up populated —
the planner's gap-closure contract is `truth, reason, artifacts, missing` (see
gsd-plan-phase's planner prompt), and an empty `missing:` gives it nothing to plan
from. Then set the frontmatter `status:` to `diagnosed` and commit the update if not
already covered by the UAT commit.

Suggest: `/gsd-plan-phase {N} --gaps` to plan fixes, then
`/gsd-execute-phase {N} --gaps-only` to apply them.

## Next up

Per the pipeline in conventions §10 — suggestions, never gates:

- Issues found: `/gsd-plan-phase {N} --gaps` → `/gsd-execute-phase {N} --gaps-only`
- Frontend phase: `/gsd-ui-review {N}` — visual quality audit
- Clean phase: `/gsd-ship {N}` — open the PR
- Not sure: `/gsd-progress` — where am I, what's next
