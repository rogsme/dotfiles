# Verification report

One review per run, posted with `post-review` and no inline comments. The report records this head, not a history:

```
## Agent verification

Verified head: <full SHA>
Verified base: <the base SHA the review summary names, or "not named" for the pull request body's procedure>
Procedure: <link to the review summary, or "the pull request body">
Verified by: <the harness and model in use, or "Unknown">

1. PASSED: <what you saw, in one sentence> (<capture link, or the command>)
2. FAILED: expected <the step's expected result>, saw <what happened> (<capture link, or the command and its output>)
3. NOT RUN: <needs a person: why>, or <setup failed: the error>

Cleanup: <done, or what is left and why>
Verification: <PASSED | FAILED | INCOMPLETE>
```

## Rules

- One line per numbered step, in the procedure's order and with its numbers. A step's sub-steps fold into its line.
- `Verification: FAILED` when any step failed; `INCOMPLETE` when none failed and any was not run; `PASSED` only when every step passed.
- A failed step names the expected result and the observation, so a fixer can reproduce it without rerunning the whole procedure. Put a longer output below the line in a fenced block, under the step's number.
- A capture that could not be uploaded is named by its local path, with the reason.
- Exactly one `Verification:` line appears, last. Never write a `Verdict:` line or a `## Human verification` heading.
