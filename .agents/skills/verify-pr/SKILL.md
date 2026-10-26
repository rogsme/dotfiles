---
name: verify-pr
description: "Run a reviewed pull request's numbered human verification steps against its exact head, the way the user would, and post the evidence: each step passed, failed or not run, with captures and command output. Never edits code or writes to the tracker. Use from a fresh session after a clean review, when the user says \"verify the PR\", \"run the human verification steps\" or \"check it works\"."
license: MIT
metadata:
  rogs-skills/contract: "1"
---

# Verify a pull request

Run the human verification procedure of one reviewed head, step by step, and post what you saw as evidence. The report is agent evidence: the user reads it and confirms the steps, or a fixer acts on the steps that failed. It never stands in for the user's confirmation.

The skill changes nothing in the branch, the tracker or the project's data beyond what the procedure's own setup and cleanup do. Its only forge writes are the capture uploads and one review.

## 0. Configuration preflight

Read only, before any git, tracker or forge action. Run this check; it prints one line per problem, and nothing when the configuration is complete:

```sh
sh -c '
cd "$(git rev-parse --show-toplevel)" || exit 1
need() { f="docs/agents/$1"; id="$2"; shift 2
  [ -f "$f" ] || { echo "$f: file missing"; return; }
  case "$(head -n 1 "$f")" in
    "<!-- rogs-skills config v1: $id -->") ;;
    *"rogs-skills config v"*) echo "$f: version: $(head -n 1 "$f")" ;;
    *) echo "$f: marker missing" ;;
  esac
  grep -qF "{{FILL:" "$f" && echo "$f: unfilled {{FILL: text"
  for h in "$@"; do grep -qxF -- "$h" "$f" || echo "$f: $h"; done; }
has() { f="docs/agents/$1"; shift; [ -f "$f" ] || return 0
  for h in "$@"; do grep -qxF -- "$h" "$f" || echo "$f: $h"; done; }
on() { grep -qiE "^[|] *$1 *[|] *on *[|]" docs/agents/workflow.md 2>/dev/null; }
need forge.md forge "## Forge" "## Operations" "### find-pr" "### read-pr" "### ci" "### feedback" "### post-review" "## CI gate" "## Pull requests"
need workflow.md workflow "## Features" "## Worktrees" "## Project rules" "## Human verification"
on "Browser pass" && { has forge.md "### attach"; need browser-pass.md browser-pass "## When it applies" "## Instances" "## Procedure" "## Captures"; }
on "Autonomous runs" && has workflow.md "## Autonomous runs"
on "CI review" && has workflow.md "## CI review"
true'
```

When it prints nothing, read the files it checked and continue. When it prints anything, change nothing and reply with exactly:

```
rogs-skills is not configured for verify-pr in this repository.
Missing: <every line the check printed, separated by commas>
Run /setup-rogs here, then run /verify-pr again.
Status: SETUP_REQUIRED
```

When the check reports files missing here that exist in the main worktree (the first entry of `git worktree list --porcelain`), the second line says instead: "The configuration exists in <path> but not on this branch. Commit `docs/agents/` to the base branch, then merge the base into this branch." When it reports a version, the second line says: "The configuration is version <n>; this skill expects version 1.", followed by "Run /setup-rogs here to update it." for an older version or "Run `npx skills update` to update the installed skills." for a newer one.

From here on, "the forge" and every operation named in backticks (`read-pr`, `post-review`, ...) mean what those files define, under their operating rules. Any stop below that names no status of its own ends with `Status: BLOCKED` and a one-line `Reason:`.

Ask the user through the harness's structured question tool (`AskUserQuestion` in Claude Code, `question` in OpenCode) when it has one, and again when an answer leaves the decision open. A turn that ends in plain text while the run waits for the user is a stop, even one that only answers the user's reply to an earlier question: its `Reason:` names the decision. After the report, a reply to a later message from the user ends with the status line that applies then. A runner that watches the session reads a turn with neither a pending question nor a status line as a finished run.

When the request says the run is autonomous, follow [Autonomous runs](#autonomous-runs) in place of every question below.

The `Agent verification` row in `## Features` tells a runner whether to start this skill after a clean review. A user who asks for it directly gets it either way.

## 1. Verify independence and the head

1. Require a session that did not implement or fix this change. When the current context shows this session wrote it, stop and ask for a separate session.
2. Read the current branch and require the checkout directory's basename to match it (`## Worktrees`).
3. Find the open pull request for that exact branch with `find-pr`, verify its base is the base `## Forge` names, and record its exact head SHA. Fetch, and require the local `HEAD` to equal that head; fast-forward a clean checkout that is behind, and stop when it differs otherwise.
4. Require a passing gate for that exact head per `## CI gate`. When the checks are pending, failing or stale, post nothing and end with `Status: BLOCKED_FOR_SYNC`.
5. Load the procedure with `feedback`: the newest review summary carrying `Verdict: READY_FOR_HUMAN` whose `Reviewed head:` is this exact head, and the numbered procedure under its `## Human verification` section. When no such summary exists and the CI reviewer that `## CI review` names, or an automated reviewer that `## CI gate` names, cleared this exact head, use the pull request body's `## Human verification` section instead. When neither exists, post nothing and end with `Status: BLOCKED_FOR_SYNC`: the head needs a clean review first.

The base may have moved since the review. Verify the head as it is: the review pinned its base, and the steps carry over clean merges of the base the way the user's confirmations do.

## 2. Plan the run

Read the whole procedure: its environment and setup, every numbered step with its expected result, the cleanup, and the surfaces it says it cannot verify. Read `## Project rules` for the data boundaries, and with the browser pass on, read `browser-pass.md` for the instances, their ports, start order, seed and capture rules.

Sort each step:

- A step you can run goes ahead: a page you can drive with the `playwright-cli` skill, or a command, API call, query or log you can run from this checkout.
- A step that needs a person is `NOT RUN`, with the reason: a real phone or device, a real inbox or account outside the test data, a physical action, or a judgment the step reserves for the user.
- A step that acts on anything other than the instances this run starts and this checkout, such as a staging environment, a shared service or production data, is `NOT RUN` with that reason, unless `## Project rules` allows this skill to use it. Reading such a target is fine; changing it is the user's call.

When every step needs a person, skip to step 5 and report.

## 3. Set up

Run the procedure's setup exactly as written, starting each instance as `browser-pass.md` says, on the ports it gives for a worktree. Use only seed and test data. When the setup fails, keep the error: the steps that depend on it become `NOT RUN` with that error, and the run goes on with the steps that do not. Report a missing seed or a broken setup; never work around it by editing the application, its configuration or its data.

## 4. Run each step

Run the steps in order, each exactly as written: the URL, the control, the input, the command and the wait condition it names. Compare what you observe with the step's expected result, and record the observation in one sentence.

- For a page, call the Skill tool with "playwright-cli" and drive the real application against the real backend. Capture a settled surface once the step's result is on screen, and look at the capture before keeping it, as `browser-pass.md` `## Captures` describes.
- For a command, an API call, a query or a log, record the exact command and the part of its output that proves the result.
- A step whose result differs from the expected one runs once more, from a clean state. When the second run passes, the step still fails, and the report gives both observations: an intermittent result is a defect the user needs to see.
- A step you cannot finish because the environment broke under it is `NOT RUN`, with the error.

Every step ends `PASSED`, `FAILED` or `NOT RUN`. A step passes only on an observation that matches its expected result; never infer a pass from code, tests or an earlier head.

## 5. Clean up and post

1. Run the procedure's cleanup, and stop every instance this run started by sending SIGTERM to its own process id. Note anything the cleanup could not undo.
2. Upload each capture with the forge's `attach`, titled with the step number and what it proves. When the forge cannot attach, keep the captures in a temporary directory outside the repository, name the paths in the report, and say so.
3. Refresh the pull request with `read-pr`. When its head moved during the run, post nothing and end with `Status: BLOCKED_FOR_SYNC`: the evidence is for a head that is gone.
4. Post one review with `post-review`, with no inline comments, written as [references/report.md](references/report.md) says.

## 6. Report

Return the review link, the verified head, and one line per step. End with:

- `Status: VERIFIED` when every step passed;
- `Status: VERIFICATION_FAILED` when any step failed. The posted report is feedback that `address-pr-review` picks up;
- `Status: VERIFICATION_INCOMPLETE` when no step failed and at least one was not run. The user runs those steps.

## Autonomous runs

An autonomous run is one whose request says "This run is autonomous". Follow `## Autonomous runs` in `workflow.md` in place of every step that asks the user, and stop with `Status: BLOCKED` when the row for autonomous runs is off or that section is missing. In this skill, the run goes as written: an autonomous run cannot merge on a report that is not `PASSED`, so a step stays `NOT RUN` or `FAILED` exactly as observed. When step 1 finds this session wrote the change, stop with `Status: BLOCKED`.

## Gotchas

- Verification is read-only for the code: never fix, commit, push, merge, resolve a thread, or write to the tracker, even when the fix is one line. The report is what moves the work.
- The report holds no `Verdict:` line and no `## Human verification` heading, so nothing reads it as a review summary.
- Captures show seed or test data only, and nothing the data boundaries in `## Project rules` keep out.
