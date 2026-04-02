---
name: commit
description: >-
  This skill should be used when the user asks to "commit", "commit changes",
  "commit my work", "make a commit", "create commits", "commit what I have",
  or any variation of committing unstaged/staged changes. Also triggers on
  "/commit". Analyzes changes and creates one or more logical atomic commits
  following the repository's own commit conventions.
argument-hint: "[optional message or guidance]"
---

# Commit — Atomic Commits Following Repository Conventions

Create one or more logical atomic commits from all uncommitted changes (staged, unstaged,
and untracked) by analyzing the repository's own commit history to match its conventions.

## Step 1: Learn the repository's commit conventions

Run `git log --no-merges --format='%s' -20` to read the last 20 non-merge commit subjects.

Analyze the patterns to determine:
- **Format**: Conventional commits (`type(scope): message`), plain messages, or other
- **Types used**: e.g., `feat`, `fix`, `test`, `style`, `docs`, `chore`, `refactor`
- **Scope usage**: Always present, optional, or never used
- **Case style**: Lowercase start, sentence case, etc.
- **Body style**: Run `git log --no-merges --format='%s%n%b---' -10` if needed to check
  whether commits typically include bodies (bullet points, paragraphs, or none)

Do NOT impose conventional commits if the repo doesn't use them. Match what exists.

## Step 2: Survey all uncommitted changes

Run these commands to get the full picture:

```bash
git status
git diff              # unstaged changes
git diff --cached     # staged changes
```

Read every modified/added/deleted file to understand what changed and why. Do not skip files.
For new untracked files, read them to understand their purpose.

## Step 3: Group changes into logical atomic commits

Analyze all changes and group them into logical units. Each commit should represent one
coherent change. Common grouping strategies:

- **Single logical change** -> one commit (most common case)
- **Multiple independent changes** -> separate commits, one per logical unit
- **Test + implementation** -> may be one commit or separate, match repo convention

Grouping rules:
- A commit should be self-contained: it should not break the build or tests on its own
- Related changes across multiple files belong in the same commit (e.g., a route + its schema + its test)
- Unrelated changes should be separate commits even if they touch the same file area
- Formatting/style changes separate from functional changes
- Documentation changes separate from code changes (unless tightly coupled)

If ALL changes are part of one logical unit, create a single commit. Do not split artificially.

## Step 4: Create each commit

For each logical group, in dependency order (base changes first):

1. **Stage only the relevant files** — use `git add <file1> <file2> ...`, never `git add -A` or `git add .`
2. **Write the commit message** matching the conventions discovered in Step 1
3. **Create the commit** using a HEREDOC for proper formatting:

```bash
git commit -m "$(cat <<'EOF'
type(scope): subject line here

- Detail bullet if the repo convention uses bodies
- Another detail
EOF
)"
```

Message guidelines:
- Subject line: concise, focuses on the "why" or "what" (not "how")
- Body: only include if the repo convention uses bodies AND the change warrants explanation
- Match the tense, case, and punctuation style of existing commits
- If the user passed an optional message/guidance as an argument, incorporate it

## Step 5: Verify

Run `git status` after all commits to confirm the working tree is clean (or only has
intentionally uncommitted files). Run `git log --oneline -N` (where N = number of commits
created) to show the user what was committed.

## Important Rules

- **Check CLAUDE.md first** for any project-specific commit rules (e.g., forbidden trailers,
  required formats, branch naming). These override the conventions inferred from history.
- **Never use `git add -A` or `git add .`** — always stage specific files by path.
- **Never commit files that likely contain secrets** (`.env`, credentials, keys). Warn the user.
- **Never amend existing commits** unless the user explicitly asks.
- **Never push** unless the user explicitly asks.
- **If pre-commit hooks fail**: fix the issues, re-stage, and create a NEW commit (do not amend).
- **If there are no changes to commit**, inform the user and stop.
