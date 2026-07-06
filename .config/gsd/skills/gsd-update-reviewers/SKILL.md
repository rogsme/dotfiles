---
name: gsd-update-reviewers
description: Maintains the shared reviewer registry that powers gsd-review, gsd-code-review, and gsd-ui-review. Triggers on "add reviewer", "swap model", "remove reviewer", "update reviewer model", "change the review model", "list reviewers", "test the reviewers", "probe the review panel", or any mention of a model ID (e.g. lazer/…) in a review-panel context. Adds, updates, or removes panel rows in shared/reviewers.md, live-probes new or changed commands before finalizing, and can test one or all reviewers in parallel. Logs every mutation to CHANGELOG.md and verifies with bin/check.
argument-hint: "add|update|remove|list|test [slug] [model-id]"
---

Read $HOME/.config/gsd/shared/conventions.md before doing anything — it defines subagent conventions, the question format, and shared asset paths.
The only panel-data file this skill edits is `$HOME/.config/gsd/shared/reviewers.md` — the single source the three review skills consume at runtime (plus a CHANGELOG entry per the Finish section). Nothing about the panel lives anywhere else; keep it that way.

## Purpose

Registry maintenance for the cross-AI reviewer panel. The registry's Panel table
(columns: slug | display | default | command) plus its Settings and Invocation
contract are what `/gsd-review`, `/gsd-code-review`, and `/gsd-ui-review` read at
runtime. This skill is how rows get added, swapped, removed, and verified — with a
live probe so a bad model ID never lands in the registry silently.

## Parse intent

Every operation needs some subset of:

- **operation** — add | update | remove | list | test
- **slug** — short lowercase identifier for the row (e.g. `kimi`, `glm-5`)
- **model ID** — the OpenCode model reference (e.g. `lazer/foo-bar`)
- **display name** — human-readable name shown in review outputs (e.g. `Foo 9 Pro`)

Infer what you can from the request ("swap kimi to lazer/kimi-3" gives all three).
If any required field is ambiguous, ask before proceeding — 2–4 concrete options
plus freeform, per conventions §9. For `update`, also establish the old identifier:
which existing row (by slug or display) is being changed.

## list

Read the registry and parse the Panel table. Display one row per reviewer:

```
slug | display | default | CLI (first word of command) | installed (via command -v)
```

Note which rows are special: `codex` and `claude` are not OpenCode-hosted — they run
their own CLIs and do not follow the standard command template. Read-only; no edits.

## add

1. Collect slug, display name, and model ID (parse or ask, per above).
2. Build the command cell from the standard OpenCode template, keeping the
   `{prompt}` and `{out}` placeholders literal — the review skills substitute them
   at invocation time:
   ```
   opencode run -m {model_id} --variant high "$(cat {prompt})" 2>/dev/null > {out}
   ```
3. Ask whether the reviewer is on the default panel (yes/no, default yes) — that
   becomes the `default` column.
4. Run the live probe (below). Only on success (or explicit user skip) proceed.
5. Insert the new row BEFORE the `claude` row — claude is always last in every
   list and table (invariant). Keep the table's column alignment readable.
6. Finish (below).

## update

Change the model ID and/or display name of an existing row in place. A slug change
is a remove + add, not an edit. Rules:

- Only touch OpenCode-hosted rows unless the user explicitly asks to change
  `codex` or `claude` — those command cells are hand-crafted, not template-based.
- Invariant: claude stays on the panel and stays last. Any change that would
  remove claude or codex requires explicit confirmation that cites the invariant
  (`shared/invariants.md`, Reviews section).
- Run the live probe on the changed command (below) before finalizing, then Finish.

## remove

1. Show the row and confirm the removal with the user.
2. Removing `claude` or `codex` requires explicit confirmation citing the
   invariant (claude must stay on the panel and last — refuse unless the user
   overrides knowingly).
3. Refuse to leave fewer than 2 panel rows — a one-model panel is not a panel.
4. Delete the row, then Finish.

## Live probe (mandatory on add/update)

Before finalizing any registry edit that adds or changes a command, prove the
command actually works. The user may pre-emptively skip the probe by saying so.

1. Write a tiny prompt file `/tmp/gsd-reviewer-probe.md` containing something like:
   "Reply with the single word OK."
2. Take the new/changed row's exact command cell and substitute
   `{prompt}` → `/tmp/gsd-reviewer-probe.md` and
   `{out}` → `/tmp/gsd-reviewer-probe-{slug}.md`.
3. Run it with a 60-second timeout (a probe should answer fast; this is not the
   10-minute review timeout).
4. **Success** = non-empty output that isn't an error message. Show the first line.
5. **Failure** (timeout, empty output, error text, non-zero exit): show what
   happened, then ask the user: keep the row anyway / fix the model ID and
   re-probe / abort the operation. Note the row's `2>/dev/null` discards stderr —
   on failure, re-run the command once WITHOUT that redirection to capture the
   actual error before asking.
6. Clean up the temp files afterwards either way.

## test [slug|all]

Probe one reviewer, or every panel row (default when no slug given), exactly as
above — same prompt file, same substitution, 60-second timeout each. Launch ALL
probes IN PARALLEL: one background command per reviewer, every launch in a single
message, then wait for completion notifications — never poll (conventions §9).
Rows whose CLI fails `command -v` are reported as cli-missing without launching.

Report a table:

```
slug | status (ok / failed / cli-missing) | approx latency | first line of output
```

This operation makes NO edits — it is a health check, nothing more. Clean up the
temp files when done.

## Finish (any mutating op)

1. **Changelog.** Append an entry at the TOP of `$HOME/.config/gsd/CHANGELOG.md` —
   after the header/preamble, before the first existing `## ` entry. Entries are
   immutable: never edit or reword an existing one. Format:

   ```markdown
   ## {date} — {one-line summary}

   **Files modified:** shared/reviewers.md

   ### What changed
   {what was added/updated/removed, old → new where relevant}
   Now {N} total reviewers ({composition — derive from the panel table's CLIs,
   e.g. "6 via OpenCode + Codex CLI + Claude Opus"; never assume the current mix}).

   ### Why
   {the user's rationale — ask for one line if not given}
   ```

2. **Check.** Run `$HOME/.config/gsd/bin/check` — it must end with
   "Status: clean". If it doesn't, show the failures and fix them before reporting.
3. **Show.** Display the updated Panel table so the user sees the final state.

NEVER git-commit from this skill — `~/.config/gsd` is the user's config repo.
Remind the user to review and commit it themselves.

## Report

End with: the operation performed, the probe result (if any), the current panel
size, and the reminder to commit `~/.config/gsd`. This is a maintenance skill, not
a pipeline step — there is no next command to suggest.
