# The configuration contract (v1)

The lifecycle skills are general. Everything they need to know about one project lives in prose files that `setup-rogs` writes into that project. This file defines those files: their paths, their required headings, what each heading holds, and which skill reads what. It is the single source of truth; the seeds in `../assets/` follow it, and so do the six lifecycle skills.

## Files

| Path in the project | Id | Written when |
|---|---|---|
| `docs/agents/issue-tracker.md` | `issue-tracker` | always |
| `docs/agents/forge.md` | `forge` | always |
| `docs/agents/workflow.md` | `workflow` | always |
| `docs/agents/domain.md` | `domain` | always |
| `docs/agents/browser-pass.md` | `browser-pass` | the browser pass is on |
| `docs/agents/pull-request.md` | `pull-request` | the repository has no pull request template of its own |
| A `## Ticket lifecycle` block in `AGENTS.md` or `CLAUDE.md` | `block` | always |

The files are prose for agents and people. Extra sections, notes and tables are welcome anywhere; the skills look up only the headings below and ignore the rest.

## Markers and versions

Line 1 of every file is a marker:

```
<!-- rogs-skills config v1: issue-tracker -->
```

The block sits between `<!-- rogs-skills:begin config v1 -->` and `<!-- rogs-skills:end -->`.

The version is one integer for the whole contract. It changes only for a breaking change: a new required heading, a renamed heading, or a heading whose meaning changes. When a skill finds a lower version than it expects, it tells the user to run `/setup-rogs`; a higher one means the installed skills are older than the configuration, and it tells the user to run `npx skills update`.

Seeds mark every value setup still has to fill as `{{FILL: what goes here}}`. A file that still contains `{{FILL:` is incomplete.

Each operation (an H3 under `## Operations`) ends with exactly one capability line, and a short note before the first operation (on placeholders, for example) is allowed:

- `Capability: Supported`
- `Capability: Fallback: <what to do instead>`
- `Capability: Unsupported`

## issue-tracker.md

| Heading | Holds |
|---|---|
| `## Tracker` | Kind; connection (MCP server name, CLI and host, or directory); workspace, team or project names with their ids; ticket id format with a regular expression; ticket URL format. When several connections to the same kind of tracker exist in a session, this names the only one to use. |
| `## Operating rules` | The shared rules for every tracker call (fixed text from the seed). |
| `## Operations` | The H3 operations below. |
| `## States` | The lifecycle roles mapped to tracker states, the terminal states, and any tracker automation that moves tickets on its own (for example on pull request events). |
| `## Labels and priority` | The P0 to P3 priority map and its guidance, the label groups every new ticket carries, and the label-creation policy. |
| `## Ticket conventions` | Title style, extra body lines the project uses, the assignee for new tickets (or none), tickets to ignore, and any project rule about how work is split. |
| `## Bundles` | Only when bundles are on: encoding, resolving, lead and riders, shared transitions. |
| `## Model routing` | Only when model routing is on: the section format, the models, and the routing criteria. |

Lifecycle roles used in `## States`: `new` (where new tickets land), `ready` (optional, treated like `new`), `in-progress`, `in-review`, `done`, `canceled`, and optionally `blocked`.

Tracker operations:

| Operation | Contract |
|---|---|
| `resolve` | Turn a ticket id, number or URL into whatever the tracker's tools need, and confirm the ticket belongs to the configured team or project. |
| `load` | Description, state, labels, priority, assignee, relations (with each related ticket's state), attachments, and every comment, following pagination until it ends. |
| `search` | Text search over open and closed tickets, archived ones included when the tracker keeps them, every page. |
| `list-in-flight` | The tickets currently in the `in-progress` and `in-review` roles. |
| `metadata` | States, labels, members and projects, read live at use time. |
| `create` | Title, description, state, priority, labels, assignee and project; returns the new id and URL. |
| `update` | Change a ticket's description or fields; states whether label writes replace the whole set. |
| `relate` | Add blocked-by, related and parent relations; states which are append-only. A tracker that lacks some relation types stays `Supported` and names the missing ones, and the skills use description lines for those; a tracker with no relations at all is `Fallback: description lines`. |
| `comment` | Find an existing comment by its first-line heading and reuse or edit it; otherwise create one; read it back. |
| `transition` | Move a ticket to the state mapped to a role, then read the state back. |
| `attach` | Upload a file to a ticket. The body says whether the returned URL is permanent; when it is not, the skills link the forge's permanent URL for the same file instead. |

## forge.md

| Heading | Holds |
|---|---|
| `## Forge` | Kind, host, repository, remote name, CLI with the flags that pin host and repository, base branch and how to re-read it, merge style (`merge` or `squash`) and how to re-read it, and the rules for running the CLI non-interactively. |
| `## Operations` | The H3 operations below. |
| `## CI gate` | Which checks gate a head and which are advisory (automated reviewers, documentation jobs); the path filters that decide whether checks run at all; what "no CI" means here; any automation that moves the base branch on its own. |
| `## Pull requests` | Where the body format lives (the repository's template on the base branch, or `docs/agents/pull-request.md`), the headings every body must contain, the title format, the related-work line format, the closing-keyword policy, the draft policy, and `Assignee:` (a login, or `none`). |
| `## Identity limits` | What the account the skills run as cannot do, such as approving its own pull request. |

Forge operations:

| Operation | Contract |
|---|---|
| `find-pr` | Find the pull request for an exact head repository, head branch and base, in open, merged or all states. Verify the returned fields; a failed query is not an empty result. |
| `push` | Push one branch with an explicit refspec and upstream, then check that the remote branch points at the local `HEAD`. Never force. |
| `create-pr` | Open a pull request non-interactively from a body file, with explicit repository, base, head and title. |
| `read-pr` | URL, state, base, head branch and exact head SHA, title, body, assignees, mergeability (an unknown value is not a conflict), and the merge commit once merged. |
| `edit-pr` | Replace the body from a file. |
| `assign` | Check that a login can be assigned, add it without removing others, and read the assignees back. |
| `ci` | Wait for the checks of one exact head SHA and report each with its conclusion, separating gate checks from advisory ones. |
| `feedback` | Every inline review thread with its resolution state and comment ids, every review body, and every conversation comment, all pages. |
| `post-review` | Post one review: a summary plus inline comments anchored to lines of the new file version. Comment-only. |
| `reply` | Reply inside an existing review thread, targeting its original comment. |
| `resolve-thread` | Mark a review thread resolved. |
| `comment` | Post a conversation comment from a body file. |
| `merge` | Merge with the configured style, without auto-merge, admin overrides or branch deletion. |
| `post-merge-ci` | Wait for the checks of the merge commit on the base branch. |
| `attach` | Upload an image or video and return a permanent URL to embed in a body or comment. |

## workflow.md

| Heading | Holds |
|---|---|
| `## Features` | A table turning each feature on or off: `Bundles`, `Browser pass`, `Model routing`, `Client notes`, `Plan review`, `Plan presentation`. An absent `Plan presentation` row in an older v1 configuration means off. |
| `## Worktrees` | The rule (branch name equals the worktree directory name equals the lead ticket id), where worktrees usually live, and who creates them (the user, never a skill). |
| `## Verification` | The format command, the full check, focused checks per area, the areas that are test-first, hook behavior, and any environment notes. A command the project lacks is written as `not configured`. |
| `## Commits` | Paths never committed, commit rules beyond the defaults, and the attribution policy. |
| `## Sync` | How a branch takes the base (a merge), the ancestor check before every push, and project notes about syncing. |
| `## Project rules` | Rule files per area, reference implementations and the terms for using them, and data boundaries. |
| `## Review` | Project invariants a review checks, house review standards, and the commands for focused reproduction. |
| `## Human verification` | The standard every human verification procedure meets. |
| `## Client notes` | Only when client notes are on: where they live, what to read before planning, and how to cite them. |
| `## Plan review` | Only when plan review is on: one row per planner vendor with the reviewer model and the command that runs it (`<brief>` marks where the brief's path goes), the time limit, the vendors that may receive the project's code and plans, and the reviewer's read-only access. |
| `## Plan presentation` | Only when plan presentation is on: the `present-plan` presenter using pinned npx execution for Lavish, checked external Marked/Mermaid renderer runtime, external artifact root permitted by the planning agent, private server state directory and port, terminal fallback policy, conversation-only approval and local-only data boundary. Lavish needs no local installation path. Presentation follows optional adversarial review and preserves its report or failure warning. |

Plan presentation is additive and optional under contract v1. It never changes the meaning of plan review or requires older projects to add a heading while the feature is absent or off. A presentation failure returns the complete report in the terminal; browser state and delivery receipts never authorize implementation. Planning may write private review artifacts outside every checkout, within the agent's allowed paths, while application files and tracker state stay unchanged.

## domain.md

| Heading | Holds |
|---|---|
| `## Glossary` | The glossary file (`CONTEXT.md` unless the project uses another name), and whether the project has one context or several with a map file. |
| `## ADRs` | The ADR directories. |
| `## Consumer rules` | Read before exploring, proceed silently when files are absent, use the glossary's terms, flag ADR conflicts. |
| `## Recording decisions` | When a decision earns an ADR, the ADR format, and the numbering rule. |

## browser-pass.md

| Heading | Holds |
|---|---|
| `## When it applies` | Which changes are user-visible and need the pass; the one-line reason a change without a visible surface records instead. |
| `## Instances` | Each surface or persona with its start command and URL, port allocation when several worktrees run at once, how instances stop, and the seed command. |
| `## Procedure` | The walk: every visible acceptance criterion, one negative check, what a failure means. |
| `## Captures` | Formats, the settle-before-capture rule, naming, where files go, data rules, and how a model without image input checks a capture. |

## pull-request.md

The body skeleton every pull request uses when the repository has no template: `## Review brief`, `## Summary`, `## Related work`, `## Attribution`, `## Validation`, `## Risks and rollout`, `## Human verification`, and `## Screenshots` when the browser pass is on. Instructions for each section live in HTML comments that the author replaces.

When the repository has its own template, `forge.md` names it, and the lifecycle skills add any required heading the template lacks to the body they write. They never edit the template file.

## The block

A `## Ticket lifecycle` section between the block markers, in the file both harnesses read: `AGENTS.md` when `CLAUDE.md` only imports or links it, otherwise `CLAUDE.md`, otherwise `AGENTS.md`. It names the configuration files, draws the lifecycle, states the separation of duties, and says that after an approved plan, "go" means `work-ticket`. Skills do not depend on it: a missing block is drift that check mode reports.

## Which skill needs what

R is required. F is required only when the feature it belongs to is on. A dash means the skill does not read it.

| Section | create-ticket | start-ticket | work-ticket | review-pr | address-pr-review | finish-ticket |
|---|---|---|---|---|---|---|
| issue-tracker `## Tracker`, `## Operating rules`, `## States` | R | R | R | R | R | R |
| issue-tracker `resolve`, `load` | R | R | R | R | R | R |
| issue-tracker `search`, `metadata`, `create`, `update`, `relate` | R | - | - | - | - | - |
| issue-tracker `## Labels and priority`, `## Ticket conventions` | R | - | - | - | - | - |
| issue-tracker `list-in-flight` | - | R | R | - | - | - |
| issue-tracker `comment`, `transition` | - | - | R | - | - | R |
| issue-tracker `attach` | - | - | F | - | F | - |
| issue-tracker `## Bundles` | F | F | F | F | F | F |
| issue-tracker `## Model routing` | F | F | F | - | - | - |
| forge `## Forge` | - | R | R | R | R | R |
| forge `find-pr`, `read-pr`, `ci`, `feedback`, `## CI gate`, `## Pull requests` | - | - | R | R | R | R |
| forge `push`, `edit-pr` | - | - | R | - | R | - |
| forge `create-pr`, `assign` | - | - | R | - | - | - |
| forge `post-review`, `resolve-thread` | - | - | - | R | - | - |
| forge `reply` | - | - | - | R | R | - |
| forge `comment` | - | - | - | R | R | R |
| forge `merge`, `post-merge-ci` | - | - | - | - | - | R |
| forge `## Identity limits` | - | - | - | R | - | R |
| forge `attach` | - | - | F | - | F | - |
| workflow `## Features` | R | R | R | R | R | R |
| workflow `## Worktrees` | - | R | R | - | R | R |
| workflow `## Verification` | - | R | R | - | R | - |
| workflow `## Commits`, `## Sync` | - | - | R | - | R | - |
| workflow `## Project rules` | R | R | R | R | R | - |
| workflow `## Review` | - | - | - | R | - | - |
| workflow `## Human verification` | - | - | R | R | R | R |
| workflow `## Client notes` | F | F | - | - | - | - |
| workflow `## Plan review` | - | F | - | - | - | - |
| workflow `## Plan presentation` | - | F | - | - | - | - |
| domain (all four headings) | R | R | R | R | R | - |
| browser-pass (all four headings) | - | F | F | F | F | F |
| pull-request (when `## Pull requests` points at it) | - | - | R | R | R | - |

An operation marked `Capability: Unsupported` still satisfies the heading check. The skill then follows the gap rules below, and stops with `Status: BLOCKED` when a required operation has no way forward.

## Gap rules

| Gap | What the skills do |
|---|---|
| The tracker cannot attach files | Upload captures to the forge only; the tracker comment links the forge URLs. |
| The forge cannot attach files | Upload captures to the tracker only, and link them from the pull request when the tracker's URLs are permanent; otherwise treat it as neither side being able to attach. |
| Neither can attach | Keep captures in a temporary directory outside the repository, list their paths, and mark every visible criterion as needing human confirmation. |
| No relations | Use the `Blocked by:` and `Delivers with:` lines in ticket descriptions alone. |
| No native states | Use whatever `## States` maps the roles to (labels, a project field, open and closed). |
| Comments cannot be edited | Post a new comment that links the one it supersedes. |
| Search cannot see archived tickets | Search what is visible and state the limit in the duplicate report. |
| Threads cannot be resolved | List the threads that need resolving by hand. |
| No inline review comments | Put each finding in the review summary as `path:line`. |
| No threaded replies | Answer each thread with a conversation comment that quotes its `path:line` and links its first comment. |
| Merges go through a queue or train | `finish-ticket` checks the packet, asks the user to merge through the queue or train, and completes the tickets on its next run, when it finds the pull request merged. |
| No CI | Say so in the handoff and the review instead of linking checks. |
| Plan presentation is unavailable or unsafe | Return `Not presented: <reason>` and the full canonical report in the terminal, preserving adversarial findings or `Not reviewed:`. Approval still happens in the conversation. |

## Preflight (step 0 of every lifecycle skill)

Each lifecycle skill runs this before any git, tracker or forge action. Its step 0 embeds a short `sh -c` check built from its column of the table above. For every file the skill needs, the check confirms that the file exists, that line 1 is the marker with version 1, that no `{{FILL:` text remains, and that every required heading exists as a whole line. Feature headings are checked only when `## Features` turns the feature on, and `pull-request.md` only when `## Pull requests` points at it. The check prints one line per problem and nothing when the configuration is complete. It is a script rather than an instruction to read the files, because a model reading prose can call an incomplete file complete.

When the check prints anything, the skill changes nothing and replies with exactly:

```
rogs-skills is not configured for <skill> in this repository.
Missing: <file>: <heading>, <file>: <heading>, ...
Run /setup-rogs here, then run /<skill> again.
Status: SETUP_REQUIRED
```

Two cases get a different second line:

- The files are missing here but present in the main worktree (the first entry of `git worktree list --porcelain`): "The configuration exists in <main worktree path> but not on this branch. Commit `docs/agents/` to the base branch, then merge the base into this branch."
- The marker version differs: "The configuration is version <n>; this skill expects version 1." Then, for an older configuration, "Run /setup-rogs here to update it."; for a newer one, "Run `npx skills update` to update the installed skills."

The engineering skills (`tdd`, `diagnosing-bugs`, `grill-with-docs`, `resolving-merge-conflicts`, `commit`, `wiki`) read these files when present and never refuse without them. `review-plan`, which start-ticket calls, reads `## Plan review` and hands the plan back unreviewed when the feature is off. `present-plan` reads `## Plan presentation` for lifecycle handovers; explicit standalone requests can supply their settings without lifecycle configuration.
