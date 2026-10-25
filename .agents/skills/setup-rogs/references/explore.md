# Exploring a repository before setup

Read only. Run every command from the repository root (`git rev-parse --show-toplevel`) and note where each finding came from, so the findings report can cite it. Check authentication with status commands only; never print a token, a credential embedded in a remote URL, or the contents of an environment file.

## Repository and worktrees

- `git rev-parse --show-toplevel`, `git branch --show-current`, `git status --short`, and `git worktree list --porcelain` (its first entry is the main worktree).
- Whether this checkout is the main worktree on the base branch. Setup writes into the checkout it runs in, so recommend the main worktree on the base branch: worktrees cut afterwards then contain the configuration.
- A dirty tree is fine; note it and leave every unrelated change alone.
- The worktree convention: the paths and branch names of existing worktrees (ticket-id-shaped names reveal the id format and the usual location), and a worktree tool's configuration when one is present.

## Forge

- `git remote -v`: remote names and hosts.
- The built-in guide that matches the host: a GitHub host (github.com or a GitHub Enterprise host) means `../assets/forge-github.md`; a GitLab host means `../assets/forge-gitlab.md`; a Gitea or Forgejo host (it answers `/api/v1/version`, or a `tea` login exists for it) means `../assets/forge-gitea.md`. Anything else uses `../assets/forge-custom.md`.
- Authentication, the base branch, the merge styles and the pull request template, each as the chosen guide's setup notes describe.
- CI definitions, read only: workflow files, job names, path filters, scheduled jobs that commit to the base branch, and bots that review pull requests.

## Tracker

- The MCP servers available in this session and the tools each one exposes. A server whose tools work on issues, tickets or tasks is a candidate connection; record its exact name. Several servers for the same kind of tracker usually mean several workspaces: ask which one belongs to this repository.
- Ticket-id patterns (`[A-Z][A-Z0-9]*-[0-9]+`) in branch names, commit subjects and recent pull request titles.
- A local ticket directory such as `.scratch/`.
- The built-in guide: `../assets/tracker-linear.md` (Linear), `../assets/tracker-kaneo.md` (Kaneo), `../assets/tracker-github.md` (GitHub Issues), `../assets/tracker-local.md` (markdown files), or `../assets/tracker-custom.md` for anything else.

## Existing agent configuration

- `AGENTS.md` and `CLAUDE.md`: which exist, whether `CLAUDE.md` only imports (`@AGENTS.md`) or links `AGENTS.md`, an existing `<!-- rogs-skills:begin` block and its version, and other sections that describe the workflow, such as rule files, client notes, reference implementations or data boundaries.
- Every file in `docs/agents/`: files written by an earlier setup (line 1 is a `rogs-skills config` marker), unmarked files at contract paths (setup adopts them and never replaces them), and other docs that hold facts, such as tracker tool catalogs, forge command maps or CI notes. Nothing in `docs/agents/` is ever deleted.
- Older project copies of lifecycle skills under `.claude/skills/`, `.agents/skills/` or `.opencode/skills/`, and rule files such as `.claude/rules/*.md` with their `paths:` frontmatter. Mine their project facts and report them as superseded by the configuration.
- `git check-ignore -v docs/agents/issue-tracker.md`. When `docs/agents/` is ignored, propose the `.gitignore` exception for the user to add.

## Verification commands

- Task runners: `justfile`, `Makefile`, `package.json` scripts, `pyproject.toml`, `Taskfile.yml`, `Cargo.toml` and similar. Prefer an aggregate check and format target, then per-area targets.
- Hooks: `lefthook.yml`, `.pre-commit-config.yaml`, `.husky/`, and which checks they run on commit.
- The test layout of each area, to propose the test-first areas.

## Domain docs

- `GLOSSARY.md`, `CONTEXT.md`, `GLOSSARY-MAP.md` or `CONTEXT-MAP.md` at the root, per-context glossaries, `docs/adr/` and any context-level ADR directories. Note which name the glossaries use: a `CONTEXT.md` gets the rename offer in step I.
- Monorepo signals (a `pnpm-workspace.yaml`, a `workspaces` field in `package.json`, several packages with their own source trees) suggest asking about several contexts.

## Commit style

- `git log --no-merges -n 30 --format=%s`: case, prefixes (Conventional Commits or not), length.
- A documented convention in `CONTRIBUTING.md` or the agent docs wins over history.

## Features

- Browser pass: a user interface in the repository, recipes that start signed-in instances, a seed command, `playwright-cli --version`, and whether the `playwright-cli` skill is installed (`npx skills list`, or the harness's skill list). The skill installs with `playwright-cli install --skills`, or with `--global` added for a home-directory install.
- Client notes: a notes path mentioned in the agent docs, and whether it exists on this machine.
- Model routing: `## Model routing` sections in existing tickets, or routing notes in the agent docs.
- Bundles: `Delivers with:` lines in existing tickets.
- Plan review: which agent CLIs answer `--version` (`claude`, `opencode`), whether `opencode debug agents` lists a `plan-review` agent, the models plans are written with here, and data boundaries or client terms in the agent docs that limit which vendors may see the code. The guides are `../assets/reviewer-claude-code.md` and `../assets/reviewer-opencode.md`.
- Taste pass: whether the `simplify-branch` skill is installed (`npx skills list`, or the harness's skill list). A missing feature row means off.
- Autonomous runs: the base branch's protection rules (a required approval keeps an autonomous run from merging), and agent docs or ticket conventions that keep a person in the loop. A missing feature row means off.
- Agent verification: whether the `verify-pr` skill is installed, and whether `playwright-cli` and its skill are present for procedures that drive pages. A missing feature row means off.
- Changelog: a `CHANGELOG.md` or release notes in the repository, a changelog tool's configuration, and `## Changelog` sections in recent pull request bodies. A missing feature row means off.
- Plan presentation: an existing `## Plan presentation` section, `npx` availability, a separately prepared Marked/Mermaid renderer runtime, an external artifact root allowed by the planning agent, and the state directory/port of any existing presentation service. Lavish runs through pinned `npx`, not a local installation. A missing feature row means off. Call the Skill tool with "present-plan" for a check-only probe when paths are known; it owns the concrete commands and setup notes. Its version probe may populate npm's cache. Make no local installation, open no review, and preserve shared services and global agent settings.

## Installed skills

- Where the lifecycle skills are installed (in this project or in the home directory).
- Whether a skill with the same name from another source would shadow one of them. In Claude Code a personal skill wins over a project skill with the same name. Every rogs skill carries `rogs-skills/contract` in its frontmatter metadata, so a same-name skill without that key comes from somewhere else.
