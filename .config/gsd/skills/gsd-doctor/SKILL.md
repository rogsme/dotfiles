---
name: gsd-doctor
description: Audits the health of the GSD installation itself — symlinks, wrappers, reviewer panel, contract seams, and invariants — and reports one table with repair offers. Use when the user says "gsd doctor", "check gsd health", "is gsd healthy", "audit gsd", "something's off with gsd", "gsd is broken", or "verify the gsd install". Runs bin/check for the mechanical layer, verifies reviewer CLIs (add --probe for a live panel test), spot-checks every seam S1-S10 and each mechanically-testable invariant, and diffs the OpenCode wrappers against skill frontmatter. Read-only; repairs are applied only on explicit user approval.
argument-hint: "[--probe]"
---

Read $HOME/.config/gsd/shared/conventions.md before doing anything. This skill audits
the GSD install at `~/.config/gsd/`, not a project — no `.planning/` needed.

# GSD Doctor

Answer one question: is this GSD install healthy? Audit five layers, produce one
health table, offer repairs. **Apply nothing without approval. Never git-commit** —
if `~/.config/gsd` has uncommitted changes, say so and let the user commit.

Path shorthand below: `skills/` = `~/.config/gsd/skills/`, `shared/` = `~/.config/gsd/shared/`.

## Step 1 — Mechanical audit

Run `$HOME/.config/gsd/bin/check` and report its output verbatim but condensed
(collapse consecutive `OK` lines into a count; show every non-OK line in full).
It already covers: symlink presence/targets, foreign `gsd-*` dirs, frontmatter
validity, referenced prompts/templates exist, no hardcoded models in review skills,
no legacy engine refs, shared docs exist, registry parses, and CLI-availability
warnings. **Do not re-implement any of these checks** — everything below audits
only what `bin/check` cannot.

## Step 2 — Reviewer readiness

From the panel table in `shared/reviewers.md`, `command -v` the first word of each
row's command and report per-slug installed/missing (this mirrors bin/check's warn,
but resolves it into the health table).

If `--probe` was passed (or the user asks for a live test): warn first that this
costs one real model call per reviewer. Then write a prompt file containing only
`Reply OK` to `/tmp/gsd-doctor-prompt.md` and run every row's exact command with
`{prompt}` → that file and `{out}` → `/tmp/gsd-doctor-{slug}.md` — ALL IN PARALLEL
in a single message (Claude Code: one background call per reviewer, wait for
completion notifications, never poll; OpenCode: one parallel tool block), 60s
timeout each (a ping doesn't need the registry's 10 minutes). Report
`slug | ok/failed | latency`; an empty or missing out-file is failed. Clean up
`/tmp/gsd-doctor-*` afterwards.

## Step 3 — Semantic seam audit

For each seam in `shared/seams.md`, read the named files at the named contract
points and spot-verify both sides still agree. Minimum checks per seam:

- **S1** — planner-prompt Step-6 schema field names appear in `shared/templates/plan.md`
  and in execute-phase's reads (`wave`, `depends_on`, `files_modified`,
  `gap_closure`, and the `security_sensitive` grep string).
- **S2** — executor-prompt's mandatory SUMMARY frontmatter fields exist in
  `shared/templates/summary.md`; ship reads `one_liner`, code-review reads key-files.
- **S3** — verifier vocabulary `passed | gaps_found | human_needed` matches in
  verifier-prompt, verification template, and every consumer listed in S3.
- **S4** — the three review skills contain zero model names/commands and use
  `/tmp/gsd-{kind}-…` temp naming with the right `{kind}` each.
- **S5** — planner tags `security_sensitive="true"`; execute-phase greps it; security
  template carries `threats_open`; ship gates on it.
- **S6** — executor commit format `{type}({NN}-{PP}):` matches code-review's
  `git log --grep="({PADDED}-"` pattern.
- **S7** — every skill's Next-up suggestions match the pipeline order in
  conventions §10 (both neighbors of each step).
- **S8** — UAT gap fields (`root_cause`, `artifacts`, `missing`) and status
  vocabulary agree across verify-work, the UAT template, diagnose-prompt, and
  planner gap-closure mode.
- **S9** — execute-phase §3 rescue-before-merge ordering and executor-prompt's
  always-commit-SUMMARY-in-worktrees language both present.
- **S10** — deferred to Step 5 (wrapper diff).

Report per-seam `OK`/`FAIL`. On FAIL, quote the disagreeing lines from both files —
a seam finding is only actionable when the exact divergence is visible.

## Step 4 — Invariant audit

Grep-verify each mechanically-testable invariant from `shared/invariants.md`:

| invariant | test |
|---|---|
| 10-min reviewer timeout | `timeout_ms: 600000` present in `shared/reviewers.md` |
| no `--no-input` | zero occurrences in `skills/` + `shared/` except lines stating the prohibition |
| no Playwright MCP | zero `mcp__playwright` / Playwright-MCP refs except the prohibition itself |
| non-blocking verifier | execute-phase still contains the `human_needed` non-blocking language |
| no code-review gate | execute-phase presents code-review/verify-work as suggestions, never a gate |
| fail-closed security gate | ship contains the `threats_open == 0` fail-closed, no-override gate |
| top-append CHANGELOG | newest date heading in `~/.config/gsd/CHANGELOG.md` is above older ones |

Report `OK`/`FAIL` per invariant with the offending line quoted on FAIL.

## Step 5 — Deployment sanity

- **Symlinks:** already verified by bin/check (Step 1); re-examine only if it flagged drift.
- **OpenCode wrappers in sync (seam S10):** for each `skills/gsd-*/SKILL.md`, compare
  the first sentence of its frontmatter `description` against the `description:` line
  in `~/.config/opencode/command/gsd-*.md`, and check the wrapper body still reads
  `Read $HOME/.claude/skills/{name}/SKILL.md …`. Report missing or stale wrappers;
  fix is `bin/gen-opencode`.
- **CLAUDE.md pointer:** `~/.claude/CLAUDE.md` still points at `~/.config/gsd`
  (canonical instructions, sync/check paths). If it still references only the retired
  `~/.config/gsd-patches` layout, WARN.
- **Retired patch-sync clobber:** `~/.config/gsd-patches/bin/sync` owns two wrapper
  files — `~/.config/opencode/command/gsd-review.md` and `gsd-verify-work.md`. If
  either has a newer mtime than the other gen-opencode wrappers or lacks the
  generated wrapper shape, warn that the retired sync likely ran (invariants: never
  run it) and offer `bin/gen-opencode` to reclaim them. That sync also `cp -f`s onto
  `~/.claude/skills/gsd-review/SKILL.md` and `gsd-verify-work/SKILL.md` — now
  symlinks, so cp overwrites the CANONICAL files in `~/.config/gsd/skills/`. If
  either canonical SKILL.md contains legacy engine references (the exact strings
  bin/check's legacy-ref audit greps for), the retired sync ran; recover from
  version control.

## Step 6 — Report and repairs

Present one table — every finding from Steps 1–5, worst first:

```
| area                    | status | fix                                        |
|-------------------------|--------|--------------------------------------------|
| symlinks (bin/check)    | OK     | —                                          |
| reviewer CLIs           | WARN   | install codex, or /gsd-update-reviewers    |
| seam S6 commit grep     | FAIL   | /gsd-modify: realign code-review grep      |
| wrappers                | WARN   | rerun bin/gen-opencode                     |
```

Then offer repairs, grouped — and apply nothing without explicit approval:

- **Mechanical** (apply on approval): rerun `bin/sync` for symlink drift;
  rerun `bin/gen-opencode` for stale/clobbered wrappers.
- **Semantic** (route, don't fix): seam or invariant FAILs go to `/gsd-modify`
  with a precise description of the disagreement — quote both sides.
- **Panel** (route): missing CLIs or failed probes go to `/gsd-update-reviewers`.

If everything is OK: say so in one line and stop. No pipeline next step — this
skill ends at the health table.
