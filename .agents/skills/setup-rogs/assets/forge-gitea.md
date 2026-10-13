# Forge guide: Gitea

## Setup notes

For setup-rogs only; this section is not copied into the project. Gitea, and Forgejo where its API matches, through the `tea` CLI: almost every call goes through `tea api`, which sends an authenticated request to `/api/v1` and prints the server's JSON.

- Detect: `curl -fsS https://<host>/api/v1/version` answers `{"version":"..."}`, usually without a login; `tea logins list --output json` holds a login whose `URL` is the remote's host; the repository has a `.gitea/` directory. Record the version: it decides which operations exist (see the version caveats below).
- Auth check: `tea logins list --output json` prints each login's name, URL and user, never a token; take the name of the login for this host. Then `tea api --login <name> -i /user` must write a `200` status line to stderr and return the account's `login`. `tea whoami` cannot serve as the check: it takes no `--login` and ignores errors. The user adds a login with `tea login add`, which is interactive, so they run it themselves. `GITEA_INSTANCE_URL` together with `GITEA_TOKEN` or `GH_TOKEN` replaces the stored login for any command without `--login`; every command here passes it.
- Repository facts: `tea api --login <name> -i /repos/<repo>` returns `default_branch`, `default_merge_style`, `default_delete_branch_after_merge`, and one flag per merge style: `allow_merge_commits` (`merge`), `allow_squash_merge` (`squash`), `allow_rebase` (`rebase`), `allow_rebase_explicit` (`rebase-merge`) and `allow_fast_forward_only_merge` (`fast-forward-only`). Offer `merge` or `squash`; the other three rebase the branch or fast-forward the base and are never offered. `tea api --login <name> -i /repos/<repo>/branches/<base>` shows `protected`, `enable_status_check`, `status_check_contexts` (the required status contexts, as glob patterns), `required_approvals` and `user_can_merge`.
- Pull request templates: Gitea fills its web form from the base repository's default branch with the first file that exists among `PULL_REQUEST_TEMPLATE.md`, `.yaml` and `.yml`, then `pull_request_template.md`, `.yaml` and `.yml` at the root, then the same six names under `.gitea/`, then under `.github/`. The API applies no template; the skills write the body themselves. After `git fetch <remote> <default branch>`, test each candidate in that order with `git cat-file -e <remote>/<default branch>:<path>`: the first that exists is the template. When the base is not the default branch, compare its copy with the default branch's and ask which one the project means. A `.yaml` or `.yml` template is a form, not Markdown: ask the user which headings a body built from it carries.
- Identity: Gitea refuses (HTTP 422) an approval or a change request from the pull request's author; a comment-only review is allowed. Record that under `## Identity limits`, with the `required_approvals` read above.
- CI: Gitea Actions reads workflows from the first of `.gitea/workflows/` and `.github/workflows/` that exists on the commit (the server's `[actions] WORKFLOW_DIRS` setting can change the list), including `.yml` and `.yaml` files in subdirectories. Path filters are `on.pull_request.paths` and `paths-ignore`, as on GitHub. Each job reports a commit status whose context is `<workflow name> / <job name> (<event>)`, where the workflow name is its `name:` (or file name) and the job name is the job's `name:` (or id): these are the names `## CI gate` lists. External CI posts statuses under its own contexts. Automated reviewers run as workflows or bot accounts; their statuses and reviews are advisory. A workflow that commits to the base (a `push` or `schedule` trigger with a push step) belongs on the automation line of `## CI gate`.
- Attachments: `POST /repos/<repo>/issues/<index>/assets` (a pull request shares its issue's index) takes a multipart `attachment` field and returns `browser_download_url`, `https://<host>/attachments/<uuid>`; `POST /repos/<repo>/issues/comments/<comment id>/assets` attaches to one comment instead. `tea api` sends only JSON, so `attach` uses `curl`, with the login's token read through `tea login helper get` so it never appears in a command. Check that the helper answers without printing the token: `printf 'host=<host>\n\n' | tea login helper get --login <name> | grep -c '^password='` prints `1`. `tea api --login <name> /settings/attachment` gives the server's limits: `enabled`, `allowed_types`, `max_size` in MB and `max_files` per upload. By default PNG, JPEG, GIF, WebP, SVG, MP4, MOV and WebM files are allowed, up to 100 MB.
- Version caveats, from the API schema of each Gitea release: resolving review threads and `content_version` on pull requests need 1.26 or newer; threaded replies, `POST /repos/<repo>/issues/<index>/assignees` and `GET /repos/<repo>/assignees/<login>` need 1.27; `GET /repos/<repo>/actions/runs` needs 1.25; the `base_branch` filter on the pull request list needs 1.24. Gitea's version after 1.27 is 28. Forgejo numbers its releases differently. On Forgejo, and on any server in doubt, check each endpoint the operations use against the server's schema, for example `curl -fsS https://<host>/swagger.v1.json | grep -c '"/repos/{owner}/{repo}/pulls/comments/{id}/resolve"'`.
- Gaps on older servers: before 1.26, `resolve-thread` is `Capability: Fallback: list the threads that need resolving by hand`. Before 1.27, `reply` is `Capability: Fallback: post a conversation comment that quotes the thread's path:line and links its first comment`, and `assign` sends the full set of assignees (its step 2 says how). Without `curl` or a working credential helper, `attach` follows the contract's gap rule for a forge that cannot attach.
- Verify on first use: that grouping inline comments by path and line, as `feedback` does, gives the threads the web interface shows, and that the first comment's `resolver` carries the thread's state; that a server older than 1.24 ignores `base_branch` rather than failing; how the web interface shows an inline comment placed outside the diff hunks; that the `curl` upload works with the helper's header on this server.

## Forge

- Kind: Gitea
- Host: {{FILL: host, for example git.example.com}}
- Repository: {{FILL: owner/name}}
- Remote: {{FILL: remote name}}
- CLI: `tea api --login <tea-login> -i`, where `<tea-login>` is {{FILL: the tea login name for this host}}, against Gitea {{FILL: the version /api/v1/version reported}}. `tea api` prefixes `/api/v1` and prints the server's JSON. Every endpoint spells the repository out (`/repos/<repo>/...`), so tea's repository discovery, which fails in linked worktrees, never picks the target.
- Base branch: {{FILL: base branch}}; re-read with: `tea api --login <tea-login> -i /repos/<repo>` (`default_branch`), or `tea api --login <tea-login> -i /repos/<repo>/branches/<base>` when the base is another branch
- Merge style: {{FILL: merge or squash}}; re-read with: `tea api --login <tea-login> -i /repos/<repo>` (`allow_merge_commits` must still be true for `merge`, `allow_squash_merge` for `squash`)
- Non-interactive use:
  - `tea api` exits 0 even when the server answers with an error. `-i` writes the status line and headers to stderr: any status outside 2xx is a failed call, and the body's `message` says why.
  - Text fields come from files: `-F body=@<file>` reads a file into one string field, and `-d @<file>` sends a whole JSON document (it cannot be combined with `-f` or `-F`). A request with a body defaults to POST; pass `-X` for any other method.
  - Lists take `page` and `limit`, and the server caps `limit` (`tea api --login <tea-login> /settings/api` shows `max_response_items`, 50 by default). Follow the `Link` header's `rel="next"` until it is gone; `X-Total-Count` gives the total.
  - Quote every endpoint: `?` and `&` are shell syntax.
  - Every operation uses `tea api`, never the `tea pr` and `tea comments` subcommands: several open a prompt, a form or an editor when an argument is missing (`tea pr create` without flags, `tea pr merge` without an index, `tea comments add` and `tea pr reply` without a body); `tea pr review` is a full-screen form; `tea pr approve` and `tea pr reject` post formal verdicts; `tea pr clean` deletes branches; and `tea pr merge` has no way to ask for the head branch to be kept (see `merge`).

## Operations

Angle brackets mark values: `<tea-login>`, `<host>`, `<repo>`, `<remote>` and `<base>` come from `## Forge`; the rest come from earlier calls. A pull request's `<index>` is its number.

### find-pr

```bash
tea api --login <tea-login> -i '/repos/<repo>/pulls?state=<open|closed|all>&base_branch=<base>&limit=50&page=<n>'
```

The state filter has no `merged`: a merged pull request has `state` `closed` and `merged` true. Keep only entries whose `head.label` is the branch, `head.repo.full_name` is the head repository (`<repo>` for a branch pushed to `<remote>`) and `base.ref` is the base. `head.ref` turns into `refs/pull/<index>/head` once the branch is gone, while `head.label` keeps the name. Read every page.

Capability: Supported

### push

```bash
git push --set-upstream <remote> refs/heads/<branch>:refs/heads/<branch>
git ls-remote <remote> refs/heads/<branch>
```

The SHA `git ls-remote` prints must equal `git rev-parse HEAD`. Run the check after a failed or interrupted push too: the remote may hold the new commit anyway, or still the old one. A rejection (the branch moved, or a branch protection or hook refused it) is reported with its message; never force.

Capability: Supported

### create-pr

1. Run `find-pr` with `state=open`, and reuse a pull request that already exists.
2. Open it:

   ```bash
   tea api --login <tea-login> -i -X POST /repos/<repo>/pulls \
     -f head=<branch> -f base=<base> -f title='<title>' -F body=@<body file>
   ```

   A head in a fork is `<fork owner>:<branch>`. A `201` returns the pull request with its `number` and `html_url`; a `409` means one already exists for this head and base.
3. Whatever the status, run `find-pr` and `read-pr`: exactly one pull request for this head and base, with the title and body sent. Repair that one with `edit-pr`; never open a second.

Capability: Supported

### read-pr

```bash
tea api --login <tea-login> -i /repos/<repo>/pulls/<index>
```

The fields: `html_url`; `state` (`open` or `closed`) with `merged`, `merged_at` and `merge_commit_sha`; `draft`; `title`; `body`; `base.ref`; `head.label` (the branch), `head.sha` (the exact head) and `head.repo.full_name`; `assignees[].login`; `mergeable`; and, on 1.26 or newer, `content_version`. `mergeable` false covers a conflict, a conflict check that is still running or that failed, and a `WIP:` title alike. Read again after a few seconds, then confirm a real conflict locally with `git merge-tree --write-tree <remote>/<base> <head sha>` (exit status 1 lists the conflicting files) before reporting one.

Capability: Supported

### edit-pr

```bash
tea api --login <tea-login> -i -X PATCH /repos/<repo>/pulls/<index> -F body=@<body file> -F content_version=<n>
```

The body is replaced whole. `<n>` is the `content_version` that `read-pr` returned; leave the field out on a server older than 1.26. A `409` means someone changed the body since: read it again and redo the edit on the new text. Read back with `read-pr`.

Capability: Supported

### assign

1. Check: `tea api --login <tea-login> -i /repos/<repo>/assignees` lists everyone who can be assigned, in one response; the login must be in it.
2. Add, on Gitea 1.27 or newer, keeping the current assignees:

   ```bash
   tea api --login <tea-login> -i -X POST /repos/<repo>/issues/<index>/assignees -F 'assignees=["<login>"]'
   ```

   On an older server, send the whole set, because that field replaces it: the logins `read-pr` lists plus the new one, as `tea api --login <tea-login> -i -X PATCH /repos/<repo>/pulls/<index> -F 'assignees=["<current login>", "<login>"]'`.
3. Read back `assignees` with `read-pr`.

Capability: Supported

### ci

1. Take `head.sha` from `read-pr`.
2. Read the statuses of that SHA, every page:

   ```bash
   tea api --login <tea-login> -i '/repos/<repo>/commits/<sha>/status?limit=50&page=<n>'
   ```

   `statuses[]` holds the latest status of each `context`, with `status` (`pending`, `success`, `failure`, `error`, `warning` or `skipped`), `description` and `target_url`. The combined `state` can read `pending` when the SHA has no status at all, so decide from `statuses` and `total_count`.
3. Gitea has no watch command: repeat the read every 30 seconds until no status is `pending`, in a loop run in the background or by running the read again; a tool timeout is not a result. On 1.25 or newer, `tea api --login <tea-login> -i '/repos/<repo>/actions/runs?head_sha=<sha>'` also shows Actions runs that are queued or waiting for approval before they post a status. A status that stays pending, such as a job waiting for an offline runner, is reported with its `target_url` and never counted as passed.
4. `success` and `skipped` pass. `failure`, `error` and `warning` fail; Gitea's combined state counts `warning` as a failure too.
5. Read `head.sha` again. When the head moved, these statuses belong to an older head: start over.
6. Report each context with its status and `target_url`, split into gate and advisory checks as `## CI gate` says. A SHA without any status passes only under the path-filter rule in `## CI gate`.

Capability: Supported

### feedback

1. Reviews, every page: `tea api --login <tea-login> -i '/repos/<repo>/pulls/<index>/reviews?limit=50&page=<n>'`. Each has `id`, `user.login`, `state` (`COMMENT`, `APPROVED`, `REQUEST_CHANGES`, `PENDING` or `REQUEST_REVIEW`), `body`, `commit_id`, `stale`, `dismissed` and `comments_count`.
2. Inline comments of every review whose `comments_count` is above 0, one response per review: `tea api --login <tea-login> -i /repos/<repo>/pulls/<index>/reviews/<review id>/comments`. Each has `id`, `path`, `position` (the new-file line; 0 on the old side, where `original_position` holds it), `commit_id`, `user.login`, `body`, `resolver`, `created_at` and `html_url`.
3. Threads: group the inline comments of all reviews by `path` and line, oldest first. The first comment opens the thread: its `id` is what `reply` and `resolve-thread` take, and its `resolver` (null while open) is the thread's resolution state.
4. Conversation comments, all in one response: `tea api --login <tea-login> -i /repos/<repo>/issues/<index>/comments`.

Capability: Supported

### post-review

1. Anchor each finding to a line of the new file version inside a diff hunk of the head (`git diff <remote>/<base>...<head sha>`). Findings elsewhere go in the summary as `path:line`.
2. Write the review as JSON to a file outside the repository, with a serializer such as Python's `json` module rather than by hand, since the texts hold quotes and newlines:

   ```json
   {
     "commit_id": "<head sha>",
     "event": "COMMENT",
     "body": "<summary>",
     "comments": [
       {"path": "src/app.py", "new_position": 42, "body": "<finding>"}
     ]
   }
   ```

   `new_position` is the line number in the new file.
3. Post it: `tea api --login <tea-login> -i -d @<review file> /repos/<repo>/pulls/<index>/reviews`. One call posts the summary and every inline comment as one review; a `200` returns it with its `id` and `html_url`.
4. Read back with `feedback` steps 1 and 2.

`event` stays `COMMENT`: `APPROVED` and `REQUEST_CHANGES` are formal verdicts the skills never post.

Capability: Supported

### reply

```bash
tea api --login <tea-login> -i -X POST /repos/<repo>/pulls/<index>/comments/<comment id>/replies -F body=@<reply file>
```

`<comment id>` is the thread's first comment. A `201` returns the reply, on the thread's `path` and line. The endpoint needs Gitea 1.27 or newer.

Capability: Supported

### resolve-thread

```bash
tea api --login <tea-login> -i -X POST /repos/<repo>/pulls/comments/<comment id>/resolve
```

`<comment id>` is the thread's first comment. A `204` means resolved; a `403` means the account may not resolve it (that takes write access, or being the pull request's author). Read back: that comment's `resolver` is set (`feedback` step 2). The endpoint needs Gitea 1.26 or newer.

Capability: Supported

### comment

```bash
tea api --login <tea-login> -i -X POST /repos/<repo>/issues/<index>/comments -F body=@<comment file>
```

A `201` returns the comment's `id` and `html_url`. Read it back with `tea api --login <tea-login> -i /repos/<repo>/issues/comments/<id>`.

Capability: Supported

### merge

1. Run `read-pr` just before: `state` is `open`, `merged` is false, and `head.sha` is the reviewed head.
2. Write the request to a file: `{"Do": "<merge or squash>", "head_commit_id": "<reviewed head sha>", "delete_branch_after_merge": false}`. `head_commit_id` makes the merge fail when the head moved. `delete_branch_after_merge` false keeps the head branch; without it, the repository's `default_delete_branch_after_merge` decides, which is why `tea pr merge`, which never sends the field, is not used. `force_merge` (an administrator override) and `merge_when_checks_succeed` (auto-merge) stay out.
3. Merge: `tea api --login <tea-login> -i -d @<merge file> /repos/<repo>/pulls/<index>/merge`. A `200` is merged. A `405` with "Please try again later" means the conflict check is still running or found a conflict: confirm as `read-pr` describes, and send the same request again only when there is no conflict. Any other `405` is a refusal (not allowed, required checks or approvals missing, a `WIP:` title), and a `409` is a conflict or "head out of date". Report it as it came; never retry with other options.
4. Read back with `read-pr`: `merged` is true, `merge_commit_sha` is set, and `head.sha` is still the reviewed head. The branch is still there: `tea api --login <tea-login> -i /repos/<repo>/branches/<branch>` answers `200`.

Capability: Supported

### post-merge-ci

Run `ci` steps 2 to 4 on `merge_commit_sha` from `read-pr`, adding `&event=push` to the `actions/runs` read. Statuses can take a minute to appear after the merge. When the merged diff touches none of the base-branch workflows' path filters, none are expected: say so.

Capability: Supported

### attach

`tea api` sends only JSON, so the upload uses `curl`, with the token read from tea's credential helper so it never appears in a command or log:

```bash
curl --fail-with-body -sS \
  -H @<(printf 'host=<host>\n\n' | tea login helper get --login <tea-login> | sed -n 's/^password=/Authorization: token /p') \
  -F 'attachment=@<file>' \
  'https://<host>/api/v1/repos/<repo>/issues/<index>/assets?name=<file name>'
```

A `201` returns the attachment. Its `browser_download_url` (`https://<host>/attachments/<uuid>`) is the permanent URL to embed, as `![<what it proves>](<url>)`. A `413` means the file is over the server's size limit, a `422` that its type is not allowed. Read back: `tea api --login <tea-login> -i /repos/<repo>/issues/<index>/assets` lists it.

Capability: Supported
