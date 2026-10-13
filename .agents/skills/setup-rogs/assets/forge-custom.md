# Forge guide: custom

## Setup notes

For setup-rogs only; this section is not copied into the project. A skeleton for a forge without a built-in guide: the user describes how each operation works on their forge, and setup writes down only what was described or checked.

- Forge section: ask for the kind, host, repository and remote; then the command line tool or HTTP client, how it authenticates without a token in the command, and the flags or URL parts that pin host and repository on every call. Read the base branch and the allowed merge styles live. Offer `merge` or `squash`; a style that rebases is never offered.
- Operations: take them in the order below, one question per operation, and quote each one's contract from the forge operations table in the configuration contract (`references/contract.md`). Each answer names the exact command or API call, the response fields that prove the right object came back, how pagination works and how the last page shows, and how a write is read back.
- `push` is plain git on every forge and is already written below.
- Check every read operation live where the forge allows it: `find-pr`, `read-pr`, `feedback` and `ci`, against an existing pull request. Writes are described, never tried during setup.
- A capability the forge lacks gets `Capability: Unsupported`, or a `Capability: Fallback: <what to do instead>` drawn from the contract's gap rules: threads that cannot be resolved are listed for resolving by hand; without inline comments, findings go in the summary as `path:line`; without uploads, the rule for a forge that cannot attach files applies; without CI, the handoff says so.
- An operation nobody can describe gets no procedure. Ask whether the forge lacks it, and record it as above when it does; otherwise leave the forge file unwritten and name the operation that is missing. A guessed command never goes into the file.
- Also ask where the forge reads pull request templates from (which files, on which branch, in which order), where CI definitions live and how their path filters and job names read, how bots and advisory checks show up, the upload limits, and what the account cannot do, such as approving its own pull requests. The answers feed `## CI gate`, `## Pull requests` and `## Identity limits`.

## Forge

- Kind: {{FILL: the forge's name}}
- Host: {{FILL: host}}
- Repository: {{FILL: owner/name, or the forge's own project identifier}}
- Remote: {{FILL: remote name}}
- CLI: {{FILL: the tool or HTTP client; how it authenticates without a token in the command; the flags or URL parts that pin the host and repository on every call}}
- Base branch: {{FILL: base branch}}; re-read with: {{FILL: a read-only command that prints the default branch, or confirms the base exists}}
- Merge style: {{FILL: merge or squash}}; re-read with: {{FILL: a read-only command that shows which merge styles the repository allows}}
- Non-interactive use: {{FILL: the commands or flags that prompt or open an editor or a browser, with what to use instead; the flag for machine-readable output; quoting rules for endpoints; how a failed call shows itself, by exit status or HTTP status}}

## Operations

Angle brackets mark values: `<host>`, `<repo>`, `<remote>` and `<base>` come from `## Forge`; the rest come from earlier calls.

### find-pr

{{FILL: the call that lists pull requests for one head repository, head branch and base, in open, merged or all states; the fields checked on every entry (head repository, head branch, base, state); how to reach the next page and recognize the last one}}

Capability: {{FILL: Supported, Fallback: <what to do instead>, or Unsupported}}

### push

```bash
git push --set-upstream <remote> refs/heads/<branch>:refs/heads/<branch>
git ls-remote <remote> refs/heads/<branch>
```

The SHA `git ls-remote` prints must equal `git rev-parse HEAD`. Run the check after a failed or interrupted push too: the remote may hold the new commit anyway, or still the old one. A rejection is reported with its message; never force.

Capability: Supported

### create-pr

{{FILL: the non-interactive call that opens a pull request from a body file, with explicit repository, base, head and title; what it returns; how find-pr and read-pr then confirm exactly one pull request with that title and body; what the forge answers when one already exists}}

Capability: {{FILL: Supported, Fallback: <what to do instead>, or Unsupported}}

### read-pr

{{FILL: the call that returns the URL, state, base, head branch, exact head SHA, title, body, assignees, mergeability and, once merged, the merge commit; which mergeability values mean "not computed yet" rather than a conflict}}

Capability: {{FILL: Supported, Fallback: <what to do instead>, or Unsupported}}

### edit-pr

{{FILL: the call that replaces the body from a file, and the read-back}}

Capability: {{FILL: Supported, Fallback: <what to do instead>, or Unsupported}}

### assign

{{FILL: the read-only check that a login can be assigned; the call that adds an assignee without removing the others, or how to send the full set when the forge only replaces it; the read-back}}

Capability: {{FILL: Supported, Fallback: <what to do instead>, or Unsupported}}

### ci

{{FILL: how to list the checks of one exact head SHA, with each check's name, result and link; how to wait for them (a watch command or a polling interval) in a way that survives a tool timeout; which results mean pending, passed and failed; what the forge shows when no check ran}}

Capability: {{FILL: Supported, Fallback: <what to do instead>, or Unsupported}}

### feedback

{{FILL: the calls that return every inline review thread with its resolution state and comment ids, every review body, and every conversation comment, with the pagination of each}}

Capability: {{FILL: Supported, Fallback: <what to do instead>, or Unsupported}}

### post-review

{{FILL: the call that posts one comment-only review, a summary plus inline comments anchored to lines of the new file version; the request format and how a line is addressed; what the forge does with a line outside the diff; the read-back}}

Capability: {{FILL: Supported, Fallback: <what to do instead>, or Unsupported}}

### reply

{{FILL: the call that replies inside an existing review thread, targeting its original comment, and the read-back}}

Capability: {{FILL: Supported, Fallback: <what to do instead>, or Unsupported}}

### resolve-thread

{{FILL: the call that marks a review thread resolved, the id it takes, and the read-back}}

Capability: {{FILL: Supported, Fallback: <what to do instead>, or Unsupported}}

### comment

{{FILL: the call that posts a conversation comment from a body file, and the read-back}}

Capability: {{FILL: Supported, Fallback: <what to do instead>, or Unsupported}}

### merge

{{FILL: the call that merges with the configured style, pinned to the reviewed head SHA where the forge allows it, without auto-merge, administrator overrides or branch deletion; the options that must be sent explicitly to keep the branch; the error statuses and what each means; the read-back of the merged state and the merge commit}}

Capability: {{FILL: Supported, Fallback: <what to do instead>, or Unsupported}}

### post-merge-ci

{{FILL: how to find the checks of the merge commit on the base branch and wait for them}}

Capability: {{FILL: Supported, Fallback: <what to do instead>, or Unsupported}}

### attach

{{FILL: the call that uploads an image or video and returns a permanent URL to embed in a body or comment; the size and type limits; the read-back}}

Capability: {{FILL: Supported, Fallback: <what to do instead>, or Unsupported}}
