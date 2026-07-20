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
changed between the target branch and HEAD. Run it in read-only mode. If it reports
violations that should block the PR, stop and report them; do not fix or commit them.

### Phase 2: Quality Gates

Read project instructions, manifests, task runners, and CI configuration to discover
the repository's quality commands. Run each applicable configured gate directly:

1. **Lint** — Run the project linter without auto-fix flags.
2. **Typecheck** — Run the type checker when the project uses one.
3. **Test** — Run the full test suite.

Do not modify files, auto-fix failures, or commit during quality gates. Stop and report
the failing command and its relevant output. Do not invent gates that do not apply to
the project's ecosystem.

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
- If any quality gate fails, stop the pipeline and report which command failed and why.

## Key Rules

- Never force-push. Use regular `git push`.
- Run every applicable repository-defined quality gate before creating the PR.
- Never create a PR with failing checks.
- Always assign the PR to `rogsme`.
- Respect project-specific `CLAUDE.md` instructions (e.g., commit message format, branch strategy).
