# Tracker guide: GitHub Issues

## Setup notes

For setup-rogs only; this section is not copied into the project. GitHub Issues through the `gh` CLI, with states kept in labels or in a project's Status field.

- Detect: the remote points at `github.com` or a GitHub Enterprise host, and the repository's issues are in use (`gh issue list --repo <repo> --state all --limit 5`); `.github/ISSUE_TEMPLATE/`; commits and pull requests that reference `#123`; no other tracker's ids or links.
- Connection check: `gh repo view <repo> --json nameWithOwner,hasIssuesEnabled,viewerPermission`. Success names the repository, with `hasIssuesEnabled: true` and a `viewerPermission` of `TRIAGE` or higher (labels, assignees and closing need it). Failure is one of: an authentication error (`gh auth status --hostname <host>` explains it), a repository `gh` cannot resolve (a wrong name, or no access), or issues turned off. The user signs in by running `gh auth login --hostname <host>` in their own terminal; the project-field variant also needs `gh auth refresh --hostname <host> --scopes project`.
- Version: `relate` and `attach` use `--add-blocked-by`, `--parent` and `--attach`, which gh 2.100.0 has. When `gh issue edit --help` lacks the first two, `relate` uses its API calls; when `gh issue comment --help` lacks `--attach`, ask the user to update gh, or mark `attach` Unsupported.
- Key: GitHub numbers issues `#123`, which cannot name a branch or a directory, so ask the user for a short uppercase key (for example `ACM`); ticket ids become `<key>-<number>`. Suggest an autolink, so `ACM-123` in pull requests and commits links to issue 123, as a command for the user to run (it needs the admin role): `gh repo autolink create ACM- "https://<host>/<owner>/<name>/issues/<num>" --numeric --repo <repo>`.
- Discover: run the calls in `metadata`, and `gh project list --owner <project owner> --format json` to find the project when states live in a Status field.
- States: ask whether states live in labels or in a project's Status field, and keep only that variant of `load`, `list-in-flight`, `list-ready`, `create` and `transition` when copying the operations. Labels: new is "open, with no state label"; ready is none, or a label such as `status: ready`; in-progress is `status: in-progress`; in-review is `status: in-review`; done is "closed as completed"; canceled is "closed as not planned"; blocked is `status: blocked`, or none. A state label must exist before `transition` can add it: list the missing ones and give the user a `gh label create "<name>" --repo <repo> --color <hex> --description "<text>"` command for each. Project field: each open role maps to a Status option, and done and canceled also close the issue. Terminal states: closed, with any reason.
- Automation: a pull request merged into the default branch closes every issue it names with a closing keyword (`Fixes #123`) or links under Development; a project's built-in workflows can set Status when an item closes or its pull request merges. Record each that applies under Automation.
- Priority: GitHub has none. Offer labels (`priority: P0` to `priority: P3`), a project field, or none. When the organization defines issue types, offer them (`--type`) for the type label group.
- Bundles: none. GitHub has no related relation, so the `Delivers with:` lines alone encode a bundle.
- Gaps: no related relation (bundles use the `Delivers with:` lines alone); no native states (labels or a project field stand in); no archive, so search sees every issue.
- Verify on first use: the shape of `projectItems` in `gh issue view --json` (the operations read `status.name`); whether `gh project` commands reach a host other than `github.com` without `GH_HOST=<host>` in front; whether `blockedBy` and `subIssues` carry each related issue's state; that `gh issue comment` prints the new comment's URL (when it does not, find the comment by its heading as `comment` does).

## Tracker

- Kind: GitHub Issues
- Repository: `{{FILL: HOST/OWNER/REPO, for example github.com/acme/shop}}`. Below, `<repo>` is this value, `<host>` its host, and `<owner>/<name>` the rest.
- Connection: the `gh` CLI, signed in to `<host>`. Name the repository on every call: `--repo <repo>` on `gh issue` and `gh label`, and `--hostname <host>` with the path written out (`repos/<owner>/<name>/...`) on `gh api`, in place of the `{owner}` and `{repo}` placeholders. Write each body to a file outside the repository, and pass `--title` and `--body-file` so `gh` never prompts or opens an editor.
- States: {{FILL: "labels", or "the Status field of the project titled <project title>, number <project number>, owned by <project owner>"}}
- Ticket ids: `{{FILL: key}}-<number>`, matched by `^{{FILL: key}}-[1-9][0-9]*$`, where `<number>` is the issue number: `{{FILL: key}}-123` is issue `#123`. The key exists only so branch and directory names can carry the id; GitHub knows the issue as `#<number>`.
- Ticket URLs: `https://<host>/<owner>/<name>/issues/<number>`
- Issues and pull requests share one number space, so a number is a ticket only when it names an issue.

## Operations

Angle brackets mark values: identity values come from `## Tracker`, the rest from earlier calls.

### resolve

Take the number from `<key>-<number>`, `#<number>`, a bare number, or an issue URL of this repository. Then:

`gh api --hostname <host> repos/<owner>/<name>/issues/<number> --jq '{number, state, html_url, is_pr: (.pull_request != null)}'`

Require `is_pr` to be `false` and `html_url` to be this repository's URL for that issue; a transferred issue answers with its new repository's URL. Every `gh issue` command takes the number; only the API calls in `relate` take the issue's database `id`.

Capability: Supported

### load

1. `gh issue view <number> --repo <repo> --json number,title,body,state,stateReason,labels,assignees,milestone,parent,subIssues,blockedBy,blocking,url`. With a project field, add `projectItems` to the list.
2. Comments, with the ids `comment` edits by: `gh api --hostname <host> --paginate repos/<owner>/<name>/issues/<number>/comments --jq '.[] | {id, user: .user.login, created_at, body}'`.
3. Each related issue's state: `gh issue view <related number> --repo <repo> --json number,state,stateReason,labels`, plus `projectItems` with a project field.
4. Attachments are the `user-attachments` links in the body and the comments.

Capability: Supported

### search

`gh issue list --repo <repo> --state all --search "<terms>" --limit 1000 --json number,title,state,stateReason,labels,url`, once per set of terms. It covers open and closed issues; GitHub archives none. `gh` pages internally up to `--limit`, and the search behind it stops at 1000 results, so when 1000 come back, narrow the terms.

Capability: Supported

### list-in-flight

With labels: `gh issue list --repo <repo> --state open --label "<in-progress label>" --limit 1000 --json number,title,labels,assignees,url`, then the same with the in-review label. When the count equals `--limit`, raise it and list again.

With a project field: `gh issue list --repo <repo> --state open --limit 1000 --json number,title,assignees,projectItems,url`, keeping the issues whose `projectItems` entry with the project's `title` has the in-progress or in-review option as its `status.name`.

Capability: Supported

### list-ready

With labels: `gh issue list --repo <repo> --state open --limit 1000 --json number,title,labels,assignees,url`, keeping the issues that carry no state label, plus the ones with the ready label when `## States` maps one. When the count equals `--limit`, raise it and list again.

With a project field: the same call with `projectItems` added to `--json`, keeping the issues whose `projectItems` entry with the project's `title` has the new or ready option as its `status.name`.

Capability: Supported

### metadata

- States: with labels, the state labels in the `gh label list` output below; with a project field, the Status options from `gh project field-list <project number> --owner <project owner> --format json`.
- Labels: `gh label list --repo <repo> --limit 1000 --json name,description`.
- Members: `gh api --hostname <host> --paginate repos/<owner>/<name>/assignees --jq '.[].login'`.
- Projects: milestones from `gh api --hostname <host> --paginate repos/<owner>/<name>/milestones --jq '.[] | {number, title}'`, and projects from `gh project list --owner <project owner> --format json`.
- The connected account: `gh api --hostname <host> user --jq .login`.

Capability: Supported

### create

`gh issue create --repo <repo> --title "<title>" --body-file <file>`, with one `--label "<label>"` per label, and `--assignee <login>`, `--milestone "<milestone title>"` or `--project "<project title>"` when the conventions call for them. It prints the new issue's URL; the number is its last segment, and the ticket id is `<key>-<number>`.

With labels, the new state's label goes among the `--label` flags when that state has one. With a project field, pass `--project "<project title>"`, then set the new issue's Status as `transition` does.

Read the issue back with `gh issue view`.

Capability: Supported

### update

`gh issue edit <number> --repo <repo>` with `--title`, `--body-file`, `--add-label`, `--remove-label`, `--add-assignee`, `--remove-assignee`, `--milestone` or `--remove-milestone`.

- `--add-label` and `--remove-label` change one label each and leave the rest in place; no flag replaces the whole set.
- `--body-file` replaces the whole body: read it with `gh issue view <number> --repo <repo> --json body --jq .body`, change it, and write all of it back.
- Read back with `gh issue view`.

Capability: Supported

### relate

- Blocked by: `gh issue edit <blocked number> --repo <repo> --add-blocked-by <blocker number>`; `--remove-blocked-by` removes it.
- Parent: `gh issue edit <child number> --repo <repo> --parent <parent number>`; `--remove-parent` removes it. An issue has at most one parent.
- Related: GitHub has none.

With a `gh` that lacks these flags, use the API with database ids, read with `gh api --hostname <host> repos/<owner>/<name>/issues/<number> --jq .id` (the number and `node_id` are different values): `gh api --hostname <host> -X POST repos/<owner>/<name>/issues/<blocked number>/dependencies/blocked_by -F issue_id=<blocker database id>`, and `gh api --hostname <host> -X POST repos/<owner>/<name>/issues/<parent number>/sub_issues -F sub_issue_id=<child database id>`. On a host without issue dependencies, the `Blocked by:` line in the description is the only record.

Read back with `gh issue view <number> --repo <repo> --json blockedBy,blocking,parent,subIssues`.

Capability: Supported

### comment

1. List the comments as `load` does. A match is a comment written by the connected account (`gh api --hostname <host> user --jq .login`) whose body's first line is the heading, for example `## Implementation handoff`; comments by other people never match, and when several match, take the newest.
2. Found: `gh api --hostname <host> -X PATCH repos/<owner>/<name>/issues/comments/<id> -F body=@<file>`; the new body replaces the old one.
3. Not found: `gh issue comment <number> --repo <repo> --body-file <file>`. It prints the comment's URL, which ends in `#issuecomment-<id>`.
4. Read back: `gh api --hostname <host> repos/<owner>/<name>/issues/comments/<id> --jq .body`.

Capability: Supported

### transition

With labels:

1. Read the state and labels: `gh issue view <number> --repo <repo> --json state,stateReason,labels`.
2. An open role: `gh issue edit <number> --repo <repo> --remove-label "<current state label>" --add-label "<new state label>"`, leaving out the flag for a side that has no label. A closed issue moving to an open role is reopened first: `gh issue reopen <number> --repo <repo>`.
3. done: remove the current state label, then `gh issue close <number> --repo <repo> --reason completed`. canceled: the same with `--reason "not planned"`.

With a project field: an issue not yet in the project joins it first (`gh issue edit <number> --repo <repo> --add-project "<project title>"`). For done and canceled, close the issue as above; to leave a closed state, reopen it. Then set the field: `gh project item-edit <project number> --owner <project owner> --url <ticket url> --field Status --value "<option name>"`. Setting the field after closing keeps the mapped option when a project workflow sets Status on close.

Read back: `gh issue view <number> --repo <repo> --json state,stateReason,labels`, plus `projectItems` with a project field. done reads `CLOSED` with `COMPLETED`, canceled reads `CLOSED` with `NOT_PLANNED`, and an open role shows its label or Status option.

Capability: Supported

### attach

1. Reuse: when a comment by the connected account whose first line is `## Captures <short head SHA>` already embeds a file under this title, use that URL.
2. Otherwise write a body file whose first line is `## Captures <short head SHA>`, followed by one `![<title>](./<file name>)` line per file, and run `gh issue comment <number> --repo <repo> --body-file <file> --attach '<path>#<title>'` with one `--attach` per file (images and videos, up to 50).
3. `gh` uploads each file and rewrites its reference to a permanent `user-attachments` URL. Read the comment back (`gh api --hostname <host> repos/<owner>/<name>/issues/comments/<id> --jq .body`) and take each file's URL from it.

Capability: Supported
