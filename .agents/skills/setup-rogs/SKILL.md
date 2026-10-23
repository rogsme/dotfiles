---
name: setup-rogs
description: "Set up or update this repository's configuration for the rogs-skills ticket lifecycle (tracker, forge, verification, domain docs and optional features), or check an existing setup for drift without changing anything."
license: MIT
disable-model-invocation: true
metadata:
  rogs-skills/contract: "1"
  opencode/autoinvoke: "false"
---

# Set up rogs-skills

Write the prose configuration the lifecycle skills (`create-ticket`, `suggest-tickets`, `start-ticket`, `work-ticket`, `review-pr`, `address-pr-review`, `finish-ticket`) read in this repository: where tickets live, how the forge is driven, how the code is verified, where the domain docs are, and which optional features are on. [references/contract.md](references/contract.md) defines every file and heading; the seeds and built-in guides in `assets/` follow it.

This is a prompt-driven skill. Explore, record what the repository and the live checks settle, ask only the decisions they leave open, show a summary of the drafts, then write. Running it again is always safe: it updates its own files in place, never duplicates anything, never overwrites an edit without showing it, and never deletes a file.

## Asking

Every choice goes through the harness's structured question tool (`AskUserQuestion` in Claude Code, `question` in OpenCode), up to four questions per call: one decision per question, two to four mutually exclusive options, the recommended option first with "(Recommended)" at the end of its label, and a one-line description per option saying what gets recorded. The tool adds a free-text answer on its own. Material only the user can describe in their own words, such as the operation-by-operation questions of the custom tracker and forge guides, is asked in plain text. Without a question tool, ask in text and put every open decision in one message. Every stop that waits on the user uses this, the final write and commit choices included.

## Modes

- Setup or update, the default.
- Check mode, when the user asks to check, verify or audit the setup: run steps 1 and 8 only, change nothing, and end with the drift report.

## 1. Explore

Follow [references/explore.md](references/explore.md). It covers the repository and its worktrees, the forge, the tracker connection, existing agent configuration (including files from earlier setups, unmarked docs, and older project copies of these skills), verification commands, domain docs, commit style, the optional features, and installed skills that could shadow these ones. Change nothing while exploring.

## 2. Present the findings

Summarize briefly what is present, what is missing, what conflicts, and what the configuration would supersede (older project copies of the lifecycle skills, hand-written tracker or forge docs). Report a contradiction in a file this skill never edits, such as a rule file that rebases where the lifecycle merges, as a finding for the user to fix; it is not a question. Then list, grouped by the sections of step 3, the values exploration settled and will record without asking, one line of evidence each; the user corrects any of them in step 5 instead of confirming them one by one. Name the built-in guides you would use:

- Trackers: [Linear](assets/tracker-linear.md), [Kaneo](assets/tracker-kaneo.md), [GitHub Issues](assets/tracker-github.md), [local markdown](assets/tracker-local.md), or [any other tracker](assets/tracker-custom.md) the user describes.
- Forges: [GitHub](assets/forge-github.md), [Gitea](assets/forge-gitea.md), [GitLab](assets/forge-gitlab.md), or [any other forge](assets/forge-custom.md) the user describes.
- Plan reviewers, when plan review is on: [Claude Code](assets/reviewer-claude-code.md) or [OpenCode](assets/reviewer-opencode.md).

## 3. Resolve the open decisions

The sections below are what the configuration must cover, not a sequence of turns. Record every value the evidence settles. A value becomes a question only when:

- exploration found no evidence for it;
- the evidence conflicts, such as an assignee pattern in history against a team that just changed;
- it is a policy the repository cannot show, such as automations configured inside the tracker;
- it drops or replaces existing user content (step 6 lists those cases).

Settle section A's connection first, and stop when its check fails. Then ask the open decisions in batches of up to four, in section order, and still stop for any live check that fails.

A. Tracker: which tracker, the connection (the exact MCP server name, the CLI and host, or the directory), and the identity (workspace, team or project, ticket key and id format). Then run the guide's connection check. When it fails, stop: write nothing, explain that setup records the connection but never edits the harness configuration, tell the user how to add it (the guide's setup notes say how), and ask them to run `/setup-rogs` again afterwards. End with `Status: BLOCKED` and a one-line `Reason:`; every other stop in this skill ends the same way.

B. States: map each lifecycle role (`new`, `ready`, `in-progress`, `in-review`, `done`, `canceled`, `blocked`) to the live states, and ask whether the tracker moves tickets on its own, for example when a pull request opens or merges. When the tracker has no blocked state, say that a ticket that waits on a blocker then keeps its state and shows the block only in its `## Blocked` comment, and that adding one makes the board show it.

C. Labels and ticket conventions: the priority map, the label groups every ticket carries, the default state and assignee of new tickets, the title style, extra body lines, and tickets to ignore.

D. Forge: kind, host, repository and remote. Read the base branch and the allowed merge styles live. Offer `merge` or `squash`; when the repository only allows a style that rebases or fast-forwards, stop and explain that this lifecycle syncs and merges without rebasing.

E. CI gate: gate checks and advisory checks, path filters, automation that commits to the base branch, or no CI at all.

F. Pull requests: the template (the repository's own on the base branch, or `docs/agents/pull-request.md`), the title format, the related-work line, and an optional assignee. When the user names an assignee, check eligibility with the forge's `assign` operation; leaving it unset means nobody is assigned.

G. Verification: the format command, the full check, focused checks per area, test-first areas, hook behavior and environment notes. Every command must exist in the repository's task runner or manifests; write `not configured` where the project has none.

H. Worktrees, commits and sync: the usual worktree location, paths that are never committed, the message style, and sync notes.

I. Domain docs: the glossary file (an existing `CONTEXT.md` or `GLOSSARY.md`, otherwise `CONTEXT.md`), one context or several, and the ADR directories.

J. Rules and review: rule files per area, reference implementations and their terms, data boundaries, review invariants, house standards, and the commands for focused reproduction.

K. Features, each on or off:
   - Bundles: the lead rule.
   - Browser pass: which changes it covers, the instances and their start commands and URLs, port allocation, the seed command, and how a model without image input checks a capture. The `playwright-cli` binary and skill must both be present; when the skill is missing, give the user `playwright-cli install --skills` (with `--global` for a home-directory install) and keep the feature off until it is installed.
   - Model routing: the frontier and cheaper models, and the criteria.
   - Client notes: the path, its layout, and whether it exists on this machine.
   - Plan review: the planner vendors that get a reviewer, each reviewer's model and its command from the reviewer guide, the time limit (at most 10 minutes, the longest a foreground shell call runs in Claude Code), and the vendors that may receive this project's code and plans. Run each chosen guide's check; when one fails, give the user its setup notes and keep the feature off until the check passes.
   - Plan presentation: local browser review through `present-plan`, or the existing terminal delivery. Lavish runs through pinned `npx`, with no local or global install. Resolve the external Marked/Mermaid renderer runtime, artifact root permitted by the planning agent, private server state directory and unprivileged port. Call the Skill tool with "present-plan" with a check-only request and those settings. Its version probe may populate npm's cache but opens no browser or review. Keep the feature off until checks pass; renderer preparation is a separate user action. Setup never installs local packages, upstream skills or global hooks. Approval remains in the agent conversation. Preserve existing choices; an absent row in an older configuration means off.
   - Taste pass: whether `work-ticket` hands the branch to `simplify-branch` after the last implementation commit, for cleanups that keep behavior. Keep the feature off until the `simplify-branch` skill is installed. An absent row in an older configuration means off.
   - Changelog: whether every pull request body carries a `## Changelog` section, one or two lines a user would care about, for a later job to gather into the project's changelog. An absent row in an older configuration means off.

## 4. Compose the files

Build each file from its seed in `assets/`, keeping the marker on line 1 and filling every `{{FILL: ...}}`:

| Project file | Built from |
|---|---|
| `docs/agents/issue-tracker.md` | `assets/issue-tracker.md`, with the tracker guide's `## Tracker` and `## Operations` sections in place of the two placeholders; then `assets/issue-tracker-bundles.md` appended when bundles are on, and `assets/issue-tracker-model-routing.md` when model routing is on |
| `docs/agents/forge.md` | `assets/forge.md`, with the forge guide's `## Forge` and `## Operations` sections in place of the two placeholders |
| `docs/agents/workflow.md` | `assets/workflow.md`, with `assets/workflow-client-notes.md` appended when client notes are on, `assets/workflow-plan-review.md` when plan review is on, and `assets/workflow-plan-presentation.md` when plan presentation is on |
| `docs/agents/domain.md` | `assets/domain.md` |
| `docs/agents/browser-pass.md` | `assets/browser-pass.md`, only when the browser pass is on |
| `docs/agents/pull-request.md` | `assets/pull-request.md`, only when the repository has no template; drop its `## Screenshots` section when the browser pass is off, and its `## Changelog` section when the changelog is off |
| The `## Ticket lifecycle` block | `assets/agents-block.md` |

A guide's `## Setup notes` stay in the guide. When a guide offers variants (states kept in labels or in a project field, for example), copy only the variant the user chose. For a tracker or forge with no guide, write the sections from the user's description using the custom guide's skeleton: every operation gets a described procedure or an honest `Capability: Unsupported` or `Capability: Fallback: ...` line, never a guess.

## 5. Show the drafts

Call the Skill tool with "writing-for-agents" before drafting. Write the drafts to a temporary directory outside the repository. Show a table with one row per file: its path, whether it is created or updated, and what it records in one line. Add a unified diff for every existing file and the block with the file it goes into, and ask any step 6 decision not yet asked. Then ask once, naming the draft directory so the user can edit the files first: write them (recommended), show the full drafts first, or cancel.

## 6. Write

The write set is the files above plus the marked block. Within it:

- A file this skill wrote before (marker on line 1) gets only the changes the user approved, section by section; every other byte stays, including the user's own edits and extra sections.
- An unmarked file at a contract path, such as an `issue-tracker.md` from another setup, is adopted: keep every existing section verbatim, merge the contract's sections in, and add the marker as line 1. When an existing section shares a contract heading but says something else, show both versions and ask which one stays.
- A marker with an older version gets the missing headings added and keeps its content. A newer version means the installed skills are older than the configuration: stop and tell the user to run `npx skills update`.
- The block goes into `AGENTS.md` when `CLAUDE.md` only imports or links it; otherwise into `CLAUDE.md`, else `AGENTS.md`; when neither file exists, ask which one to create. Replace only the text between the markers. A repository holds one block. A hand-written section about the same lifecycle stays until the user, shown both, agrees that the block replaces it.
- A section the user declines stays absent, and the skills that need it will refuse with a pointer back here.

Never edit `.gitignore` (propose the lines instead), harness configuration, CI files, rule files, skill folders or pull request template files; never delete a file; and make no tracker or forge writes.

## 7. Report

List the files created, updated and left unchanged, the docs the configuration supersedes, and any proposed `.gitignore` lines. Tell the user to commit `docs/agents/` and the block to the base branch before cutting ticket worktrees, since the lifecycle skills read the configuration from the checkout they run in. Then ask whether to commit them now or leave them uncommitted; on commit, call the Skill tool with "commit", scoped to exactly those files.

End with `Status: CONFIGURED`.

## 8. Self-check

Run this after every write, and on its own in check mode:

1. Every lifecycle skill's preflight from the contract passes against the files, for the features that are on.
2. Live probes: the tracker connection answers and the key and states exist; the forge's base branch and merge style match the file; the CI path filters match the workflow files; every verification command exists; the pull request template carries the required headings, or `pull-request.md` exists; the glossary is where `domain.md` says, or not created yet; `playwright-cli` and its skill are present when the browser pass is on; the `simplify-branch` skill is installed when the taste pass is on; the client notes path is readable when client notes are on; each configured reviewer guide's check passes when plan review is on.
3. The configuration is on the base branch: fetch, then `git diff --quiet <remote>/<base> -- docs/agents <block file>`.
4. No same-name skill from another source shadows a rogs skill.
5. When plan presentation is on, call the Skill tool with "present-plan" for a check-only probe of its recorded renderer/state/port and pinned npx execution. Confirm the artifact root is external to every worktree and permitted by the planning agent. This check opens no browser and makes no local installation; npm's cache may be populated. Browser interaction is verified separately. Report presentation drift without changing the independent plan-review setting.

Report a table with one row per check marked OK, DRIFT or MISSING, with the evidence for each. End with `Status: SETUP_OK` when every row is OK, otherwise `Status: SETUP_DRIFT` and the fix for each row (usually running `/setup-rogs` again).
