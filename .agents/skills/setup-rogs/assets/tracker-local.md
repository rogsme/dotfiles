# Tracker guide: Local markdown

## Setup notes

For setup-rogs only; this section is not copied into the project. Tickets as markdown files in one directory that every worktree shares and git never tracks.

- Detect: a `.scratch/` directory or a `.gitignore` entry for it, ticket files named like `ACM-12-<slug>.md`, a repository without a hosted tracker, or a user who asks for local tickets. Files in another layout (for example `.scratch/<feature>/issues/01-<slug>.md`) are not tickets in this format: ask before converting them.
- Directory: by default `.scratch/tickets/` inside the main worktree, the first `worktree` entry of `git worktree list --porcelain`. Every ticket worktree reaches that one directory through its absolute path, so a state change made in one worktree is visible in all of them; record the absolute path. When the first entry is a bare repository, ask the user where the directory goes.
- Connection check: `test -d <directory> && test -w <directory> && ls <directory>`, run from the worktree setup runs in. It fails when the directory is missing or not writable; the user creates it with `mkdir -p <directory>`. Propose the `.gitignore` line `/.scratch/`, and tell the user that git keeps no copy of the tickets, so their own backups are the only one.
- Key: ask the user for a short uppercase key, for example `ACM`.
- Discover: nothing to read live beyond the files: states are fixed words, labels are whatever the files use, and there are no members or projects.
- States: the `Status:` line holds the role's own name: `new`, `ready` (or none), `in-progress`, `in-review`, `done`, `canceled`, and `blocked` (or none). Terminal states: `done` and `canceled`. Automation: none.
- Priority: the `Priority:` line holds the planning value itself, `P0` to `P3`.
- Bundles: none. The files have no related relation, so the `Delivers with:` lines alone encode a bundle.
- Gaps: no related relation (bundles use the `Delivers with:` lines alone); `attach` is a fallback that keeps files beside the ticket; tickets have no URL, so the forge's related-work line carries the bare id.

## Tracker

- Kind: Local markdown files
- Directory: `{{FILL: absolute path of the ticket directory, by default <main worktree>/.scratch/tickets}}`, shared by every worktree of this repository and never committed. Every operation uses this absolute path, in whichever worktree it runs.
- Key: `{{FILL: key}}`
- Ticket ids: `{{FILL: key}}-<number>`, matched by `^{{FILL: key}}-[1-9][0-9]*$`.
- Files: one per ticket, `<directory>/<ticket id>-<slug>.md`, where `<slug>` is the title's words in lowercase, letters and digits only, joined by hyphens. A ticket's attachments live in `<directory>/<ticket id>/attachments/`.
- Ticket URLs: none. Off this machine a ticket is its id; on it, its absolute file path.
- File format:

  ```markdown
  # Rate limit the login endpoint

  Status: new
  Priority: P1
  Labels: Bug, Backend
  Assignee: none
  Blocked by: ACM-3
  Delivers with: ACM-13
  Parent: ACM-2

  The description, in markdown.

  ## Comments

  ### Implementation plan

  Date: 2026-10-12T14:03:00Z

  The comment's body.
  ```

  The first line is the title. `Status:`, `Priority:`, `Labels:` and `Assignee:` are always present; `Blocked by:`, `Delivers with:` and `Parent:` appear only when they name tickets. The description runs from the line after the header lines to `## Comments`, the file's last `## ` heading, under which every comment starts with its own `### ` line.

## Operations

Angle brackets mark values: identity values come from `## Tracker`, the rest from earlier calls.

### resolve

Take the id from a ticket id, a bare number (put the key in front), or the path of a ticket file in `<directory>`. List `<directory>/<ticket id>-*.md`: exactly one file must match. No match means no such ticket; two matches mean the directory is broken, so stop and report both paths. A path outside `<directory>` is not a ticket of this project.

Capability: Supported

### load

Read the whole file: the title, the header lines, the description and every comment. For each id in `Blocked by:`, `Delivers with:` and `Parent:`, resolve it and read its `Status:` line. The attachments are the files in `<directory>/<ticket id>/attachments/`.

Capability: Supported

### search

`grep -rilF -e '<term>' -e '<synonym>' --include='*.md' <directory>` searches every ticket, whatever its status: the directory has no archive. Match the terms against the file names (the slugs) as well.

Capability: Supported

### list-in-flight

`grep -lx -e 'Status: <in-progress state>' -e 'Status: <in-review state>' <directory>/*.md`

Capability: Supported

### list-ready

`grep -lx -e 'Status: <new state>' <directory>/*.md`, with a second `-e 'Status: <ready state>'` when `## States` maps one.

Capability: Supported

### metadata

- States: the words in `## States`; `grep -h '^Status:' <directory>/*.md | sort | uniq -c` shows the ones in use.
- Labels: the groups in `## Labels and priority`; `grep -h '^Labels:' <directory>/*.md` shows the ones in use.
- Members: none. `Assignee:` holds a name the user gives, or `none`.
- Projects: none.

Capability: Supported

### create

1. Take the next number: the highest `<n>` among `<directory>/<key>-<n>-*.md`, plus one (1 for an empty directory). Tickets are never deleted, so no number is reused: a canceled ticket keeps its file.
2. Check that no file for `<n>` exists, then write `<directory>/<key>-<n>-<slug>.md` in the format from `## Tracker`.
3. List `<directory>/<key>-<n>-*.md` again. Two files mean another session took the number at the same moment: rename yours to the next free number.
4. Return the id and the file's absolute path.

Capability: Supported

### update

Edit the file in place. The `Labels:` line is the whole label set, so rewriting it replaces the set. Change the description only between the header lines and `## Comments`, and keep every comment as it is. Read the file back.

Capability: Supported

### relate

- Blocked by: add the blocker's id to the blocked ticket's `Blocked by:` line, adding the line after `Assignee:` when it is missing.
- Parent: a `Parent: <parent id>` line on the child.
- Related: none exists; the `Delivers with:` line is the only link between bundle members.

A relation is a line, so removing one means editing the line. Read the file back.

Capability: Supported

### comment

Under `## Comments`, each comment is a `### <heading>` line, a blank line, a `Date: <UTC time>` line, a blank line and the body, running to the next `### ` line or the end of the file. The heading is the comment's first line without its `#` marks, so `## Implementation handoff` becomes `### Implementation handoff`. Write every heading inside a body at level 4 or deeper (`#### `), so a `### ` line always starts a comment.

1. Find the `### ` line whose text equals the heading.
2. Found: replace that comment, from its `### ` line up to the next one, with the new comment.
3. Not found: append the comment at the end of the file, adding `## Comments` first when the file has none.
4. Read the file back.

Capability: Supported

### transition

Rewrite the `Status:` line with the state mapped to the role. Read the file back and check the line.

Capability: Supported

### attach

Copy the file to `<directory>/<ticket id>/attachments/<file name>` and link it by that absolute path, keeping it out of the repository. The path works only on this machine, so the pull request links the forge's copy of the file.

Capability: Fallback: copy the file into `<directory>/<ticket id>/attachments/`, link it from the ticket by its absolute path, and let the forge's upload be the copy the pull request links.
