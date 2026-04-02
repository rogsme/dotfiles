---
name: create-pr
description: >-
  This skill should be used when the user asks to "create a PR", "create a PR to dev",
  "open a PR to main", "submit a PR", "make a pull request to X", "PR to X branch",
  or any variation of creating a pull request targeting a specific branch. Also triggers
  on "/create-pr".
argument-hint: "<target-branch>"
---

# Create Pull Request

Orchestrate a full pre-PR quality gate pipeline and create a GitHub pull request.
The target branch is the branch argument (e.g., "create a PR to dev" means target = `dev`).

## Workflow

Execute the following phases in order. If any phase fails and cannot be auto-fixed,
stop and report the failure to the user — do not create the PR.

### Phase 0: Preflight

1. Confirm the current branch is not the target branch. Abort if they are the same.
2. Run `git status` to check for uncommitted changes. If uncommitted changes exist,
   ask the user whether to commit first (invoke the `commit` skill) or abort.
3. Run `git log <target>..HEAD --oneline` to confirm there are commits to include.
   Abort if there are no commits.

### Phase 1: Convention Review

Invoke the **review-conventions** skill with `--branch <target>` to review all files
changed between the target branch and HEAD. Let it fix violations and commit as needed.

### Phase 2: Quality Gates (parallel where possible)

Run these three skills. They can run sequentially since each may produce commits:

1. **lint** — Run the project linter and fix any errors.
2. **typecheck** — Run the type checker and fix any errors.
3. **test** — Run the full test suite and fix any failures.

Each skill reads `CLAUDE.md ## Commands` to discover the correct project commands.

### Phase 3: Push & Create PR

1. **Push the branch:**
   ```bash
   git push -u origin HEAD
   ```

2. **Detect PR template:** Check for `.github/pull_request_template.md` in the repo root.

3. **Build PR metadata:**
   - **Title:** Derive from the branch name or commit summary. Keep under 70 characters.
   - **Body:** If a PR template exists, read it and fill in each section based on the
     commits being merged (`git log <target>..HEAD` and `git diff <target>...HEAD`).
     If no template exists, generate a body with:
     - `## Summary` — bullet points of what changed and why
     - `## Type of change` — categorize (bug fix, feature, refactor, etc.)
     - `## Test plan` — how the changes were verified

4. **Create the PR:**
   ```bash
   gh pr create \
     --base <target> \
     --title "<title>" \
     --body "$(cat <<'EOF'
   <body content>
   EOF
   )" \
     --assignee rogsme
   ```

5. **Output the PR URL** so the user can see it.

## Error Handling

- If `gh` is not installed or not authenticated, inform the user and suggest
  running `! gh auth login`.
- If the push fails (e.g., remote branch protection), report the error verbatim.
- If any quality gate skill fails after its internal fix attempts, stop the pipeline
  and report which gate failed and why.

## Key Rules

- Never force-push. Use regular `git push`.
- Never skip quality gates — all three (lint, typecheck, test) must pass.
- Never create a PR with failing checks.
- Always assign the PR to `rogsme`.
- Respect project-specific `CLAUDE.md` instructions (e.g., commit message format, branch strategy).
