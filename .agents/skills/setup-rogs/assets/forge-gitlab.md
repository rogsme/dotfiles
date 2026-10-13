# Forge guide: GitLab

## Setup notes

For setup-rogs only; this section is not copied into the project. GitLab.com, GitLab Dedicated or a self-managed GitLab, through the `glab` CLI: `glab mr create` and `glab mr update` for two writes, and `glab api` for everything else.

- Detect: a remote on `gitlab.com`, or on a host that `glab auth status --hostname <host>` knows; a `.gitlab-ci.yml` or a `.gitlab/` directory; `/-/` in the project's web URLs.
- Auth check: `glab auth status --hostname <host>` exits 0 and names the account. It prints a token only when given `--show-token`, so leave that flag out. `glab api --hostname <host> user` returns the account's `username`. The user signs in with `glab auth login --hostname <host>`, which is interactive, so they run it themselves. `GITLAB_TOKEN`, `GITLAB_ACCESS_TOKEN` and `OAUTH_TOKEN` in the environment replace the stored token, and `GITLAB_HOST`, `GITLAB_URI` and `GL_HOST` the default host: name any that are set.
- Repository facts: `glab api --hostname <host> projects/<url-encoded path>` (the full path with each `/` written as `%2F`, such as `acme%2Fapp`) returns the project. Record its numeric `id`, which the operations use. Then read:
  - `default_branch`.
  - `merge_method`: `merge` creates a merge commit and works. `rebase_merge` (semi-linear) also creates one, and merges only a branch that already contains the latest base, which the lifecycle's merge-based sync provides; it works too, as long as nobody uses GitLab's rebase button, so record its quirk under `## Forge`. `ff` (fast-forward) leaves no merge commit: refuse it.
  - `squash_option` (`never`, `always`, `default_on` or `default_off`): style `merge` needs anything but `always`, style `squash` anything but `never`.
  - `remove_source_branch_after_merge`: the project's default for new merge requests, which `create-pr` and `merge` override.
  - `only_allow_merge_if_pipeline_succeeds` and `allow_merge_on_skipped_pipeline`, for `## CI gate`; `only_allow_merge_if_all_discussions_are_resolved`, under which an unresolved thread blocks `merge`.
  - `merge_pipelines_enabled`: merged results pipelines, which `ci` handles.
  - `merge_trains_enabled`: a direct merge bypasses the train, so record `merge` as `Capability: Fallback: a person merges through the merge train`.
  - The account needs at least the Developer role (`permissions` in the same response) to push and open merge requests; who may merge into the base shows in `glab api --hostname <host> projects/<id>/protected_branches/<base>` (`merge_access_levels`).
- Merge request templates: GitLab reads them from the default branch, as `.gitlab/merge_request_templates/<name>.md`; `Default.md` (any case) is the default. A default template set in the project's settings (Premium and Ultimate; `merge_requests_template` in the project response) wins over `Default.md`, and a group's template project adds inherited templates, where a group `Default.md` ranks above the project's own. `glab api --hostname <host> projects/<id>/templates/merge_requests` lists the templates the project sees, and `projects/<id>/templates/merge_requests/<name>` returns one's `content`. For the repository's own files, read `git show <remote>/<default branch>:.gitlab/merge_request_templates/<name>.md` after a fetch. When the base is not the default branch, compare its copy with the default branch's and ask which one the project means. `glab mr create --template` reads the local checkout instead of the default branch, so it is never used.
- Identity: whether a merge request's author may approve it shows as `merge_requests_author_approval` in `glab api --hostname <host> projects/<id>/approvals`, beside the approvals the project requires. The skills never approve, so record under `## Identity limits` what the account cannot do, such as approving its own merge requests.
- CI: `.gitlab-ci.yml` at the root, unless the project's `ci_config_path` names another file; `include:` pulls in more files. `glab ci config compile`, run in a checkout of the base branch, prints the merged configuration. Jobs are the top-level keys other than global keywords (`default`, `include`, `stages`, `variables`, `workflow`, and older globals such as `image`) and hidden jobs (a leading `.`). Path filters are `rules: changes:` (or `only: changes:` and `except: changes:`) on jobs, and `workflow: rules:` for whole pipelines; when no job matches, GitLab creates no pipeline at all. A job with `allow_failure: true` never fails its pipeline, so it is advisory by construction; a `when: manual` job waits for a person. External CI posts commit statuses (`projects/<id>/repository/commits/<sha>/statuses`), and external status checks (Ultimate) live at `projects/<id>/merge_requests/<iid>/status_checks`. Automated reviewers post notes from bot users. A job that commits to the base (scheduled, or on pushes to it) belongs on the automation line of `## CI gate`.
- Attachments: `POST projects/<id>/uploads` takes a multipart `file` and returns `markdown` (a project-relative `![...](/uploads/...)` link) and `full_path`. Any file type is accepted up to the instance's maximum attachment size, 100 MB by default; only administrators can read that setting. glab's experimental `--attach` appends a link at the end of a description or note; `attach` uses the upload API so the skills place each link themselves.
- Gaps: none. On a GitLab without the draft notes API, record `post-review` as `Capability: Fallback: post each finding as its own diff thread (POST projects/<id>/merge_requests/<iid>/discussions with the same position), then the summary as a note`.
- Verify on first use, since glab is not installed where this guide was written and these details come from the glab 1.122.0 source and GitLab's API documentation: each flag with `glab mr create --help` and `glab mr update --help` (`--description-file`, `--remove-source-branch=false`, `--squash-before-merge=false`, `--assignee +<login>`); that `glab api -F <key>=@<file>` sends the file as a plain string; that the draft notes endpoints, including `bulk_publish`, exist on this instance; that a merged results pipeline is the merge request's `head_pipeline` while its `sha` is the head; that the upload response carries `full_path` (on an older version, the absolute URL is `https://<host>/<repo>` followed by `url`); that on a tier with one assignee per merge request, adding an assignee keeps the existing one; that `protected_branches` and `approvals` answer for the account's role and the instance's tier.

## Forge

- Kind: GitLab
- Host: {{FILL: gitlab.com or the self-managed host}}
- Repository: {{FILL: the full project path, such as acme/app or acme/platform/app}}
- Remote: {{FILL: remote name}}
- CLI: `glab`. Every `glab mr` command takes `-R https://<host>/<repo>`: the full URL pins host and project, where a bare `group/project` can be read as a group path on a host glab has not stored. Every `glab api` call takes `--hostname <host>` and addresses the project as `projects/<id>`, where `<id>` is {{FILL: the numeric project id}}. The `:id` and `:fullpath` placeholders resolve from the checkout, so they never appear in these commands.
- Base branch: {{FILL: base branch}}; re-read with: `glab api --hostname <host> projects/<id>` (`default_branch`), or `glab api --hostname <host> projects/<id>/repository/branches/<base>` when the base is another branch (a `/` in a branch name is written `%2F`)
- Merge style: {{FILL: merge or squash}}; re-read with: `glab api --hostname <host> projects/<id>` (`merge_method` is still `merge` or `rebase_merge`; `squash_option` is not `always` for `merge` and not `never` for `squash`). With `rebase_merge`, a merge request whose branch lacks the latest base shows `need_rebase`: sync by merging the base, never with GitLab's rebase button.
- Non-interactive use:
  - `glab api` exits non-zero and prints `glab: HTTP <code>` on an HTTP error: a failed call, never an empty result.
  - `--paginate` reads every page; without it a list stops at 20 entries. Pass `per_page=100` as well.
  - Text fields come from files: `-F description=@<file>`, `-F body=@<file>` or `-F note=@<file>`, and `-F '<key>={...}'` sends a JSON object. Any field turns a call into a POST: pass `-X PUT` for an update.
  - Quote every endpoint: `?` and `&` are shell syntax.
  - `glab mr create` and `glab mr update` receive every value as a flag, so they never prompt. Reviews, threads, comments and merges go through `glab api`, never through `glab mr merge` (it turns auto-merge on by default and leaves branch deletion to the merge request's own setting), `glab mr approve` (a formal approval) or `glab mr note create` (it starts resolvable threads). `--fill`, `--web`, `--push`, `--auto-merge` and `--template`, `glab ci view` (a full-screen viewer) and `glab ci status --live` stay unused.

## Operations

Angle brackets mark values: `<host>`, `<repo>`, `<id>`, `<remote>` and `<base>` come from `## Forge`; the rest come from earlier calls. A merge request's `<iid>` is its number within the project (the `!` number), never its global `id`.

### find-pr

```bash
glab api --hostname <host> --paginate \
  "projects/<id>/merge_requests?source_branch=<branch>&target_branch=<base>&state=<opened|merged|all>&per_page=100"
```

Keep only entries whose `source_branch` is the branch, `target_branch` is the base, and `source_project_id` is the head project (`<id>` for a branch pushed to `<remote>`, a fork's id otherwise). `state` is `opened`, `merged`, `closed` or `locked`; `iid` and `web_url` identify the merge request.

Capability: Supported

### push

```bash
git push --set-upstream <remote> refs/heads/<branch>:refs/heads/<branch>
git ls-remote <remote> refs/heads/<branch>
```

The SHA `git ls-remote` prints must equal `git rev-parse HEAD`. Run the check after a failed or interrupted push too: the remote may hold the new commit anyway, or still the old one. A rejection (the branch moved, or a protected branch, push rule or hook refused it) is reported with its message; never force.

Capability: Supported

### create-pr

1. Run `find-pr` with `state=opened`, and reuse a merge request that already exists.
2. Open it:

   ```bash
   glab mr create -R https://<host>/<repo> --source-branch <branch> --target-branch <base> \
     --title "<title>" --description-file <body file> --remove-source-branch=false \
     --squash-before-merge=<false for merge, true for squash> --yes
   ```

   `--remove-source-branch=false` overrides the project's "delete source branch" default, which is on for new projects. A glab without `--description-file` takes `--description "$(cat <body file>)"` instead. The assignee comes from `assign`.
3. Whatever the exit status, run `find-pr` and `read-pr`: exactly one merge request for this branch and base, with the title and description sent, `force_remove_source_branch` false, and `squash_on_merge` matching the style. Repair that one with `edit-pr`, or with `glab api --hostname <host> -X PUT projects/<id>/merge_requests/<iid> -F remove_source_branch=false` (or `-F squash=<true or false>`); never open a second.

Capability: Supported

### read-pr

```bash
glab api --hostname <host> projects/<id>/merge_requests/<iid>
```

The fields: `web_url`; `state`; `draft`; `title`; `description` (the body); `source_branch` and `target_branch`; `sha` (the exact head) and `diff_refs` (`base_sha`, `start_sha` and `head_sha` of the latest diff); `assignees[].username`; `detailed_merge_status` and `has_conflicts`; `merge_commit_sha`, `squash_commit_sha` and `merged_at` once merged; `force_remove_source_branch`, `squash_on_merge` and `head_pipeline`.

`detailed_merge_status` `mergeable` is mergeable and `conflict` is a conflict. `unchecked`, `checking`, `preparing` and `approvals_syncing` mean not computed yet: read again after a few seconds, and never report them as a conflict. Other values name what still blocks the merge, such as `ci_must_pass`, `ci_still_running`, `discussions_not_resolved`, `not_approved`, `draft_status` or `need_rebase`. GitLab before 15.6 has only `merge_status`: `can_be_merged` and `cannot_be_merged`, with `unchecked`, `checking` and `cannot_be_merged_recheck` while unknown.

Capability: Supported

### edit-pr

```bash
glab api --hostname <host> -X PUT projects/<id>/merge_requests/<iid> -F description=@<body file>
```

The description is replaced whole, up to 1,048,576 characters. Read back with `read-pr`.

Capability: Supported

### assign

1. Find the user: `glab api --hostname <host> "users?username=<login>"` returns one entry; keep its `id`.
2. Check: `glab api --hostname <host> projects/<id>/members/all/<user id>` answers for a member, inherited membership included. HTTP 404 means not a member, so not assignable here; any other failure leaves the answer unknown.
3. Add: `glab mr update <iid> -R https://<host>/<repo> --assignee +<login>`. The `+` keeps the current assignees.
4. Read back `assignees` with `read-pr`. GitLab drops an assignee it does not accept without an error, and a tier that allows one assignee per merge request keeps the first: when the login is missing and someone else holds the slot, report it rather than replacing them.

Capability: Supported

### ci

1. Take `sha` and `head_pipeline` from `read-pr`.
2. List the pipelines of that SHA, every page:

   ```bash
   glab api --hostname <host> --paginate "projects/<id>/pipelines?sha=<sha>&per_page=100"
   ```

   With merged results pipelines on, the merge request's pipeline runs on a temporary merge commit (`ref` `refs/merge-requests/<iid>/merge`) whose `sha` is not the head. Count `head_pipeline` as this head's pipeline while the merge request's `sha` still equals the head.
3. Wait. A pipeline is still running while its `status` is `created`, `waiting_for_resource`, `preparing`, `pending`, `running` or `scheduled`. Read it again every 30 seconds (`glab api --hostname <host> projects/<id>/pipelines/<pipeline id>`), in a loop run in the background or by running the read again; a tool timeout is not a result. `manual` means a job waits for a person: report it, and never start it. `glab ci status` follows a branch rather than a SHA, so it is not used.
4. Read the jobs of each pipeline, every page: `glab api --hostname <host> --paginate "projects/<id>/pipelines/<pipeline id>/jobs?per_page=100"`, with `name`, `stage`, `status`, `allow_failure` and `web_url`. `success` passes. `failed` with `allow_failure` true is advisory; `failed` and `canceled` otherwise fail; `skipped` jobs never ran and never count as passed. Child pipelines report through their trigger jobs at `projects/<id>/pipelines/<pipeline id>/bridges` (`downstream_pipeline.status`), and external CI through `projects/<id>/repository/commits/<sha>/statuses`.
5. Read `sha` again. When the head moved, these results belong to an older head: start over.
6. Report each job and status with its result and link, split into gate and advisory checks as `## CI gate` says. A SHA without any pipeline passes only under the path-filter rule in `## CI gate`.

Capability: Supported

### feedback

```bash
glab api --hostname <host> --paginate "projects/<id>/merge_requests/<iid>/discussions?per_page=100"
```

Each discussion has an `id` (the thread id that `reply` and `resolve-thread` take), `individual_note` and `notes[]`. Each note has `id`, `type` (`DiffNote` for an inline comment, `DiscussionNote` for a thread on the conversation, null for a single comment), `author.username`, `body`, `created_at`, `system` (true for GitLab's activity log, which is skipped), `resolvable`, `resolved` and, on diff notes, `position` (`new_path`, `new_line`, `old_path`, `old_line`, `head_sha`). A thread is resolved when every resolvable note in it is. GitLab has no review bodies: a published review's summary arrives as an ordinary note, and discussions with `individual_note` true are the conversation comments.

Capability: Supported

### post-review

1. Take `diff_refs` from `read-pr`; its `head_sha` must be the reviewed head. Anchor each finding to a line of the new file version inside a diff hunk; findings elsewhere go in the summary as `path:line`.
2. List your pending draft notes with `glab api --hostname <host> projects/<id>/merge_requests/<iid>/draft_notes`, and delete leftovers from an interrupted run (`glab api --hostname <host> -X DELETE projects/<id>/merge_requests/<iid>/draft_notes/<draft id>`), so they are not published with this review.
3. Add one draft note per inline finding:

   ```bash
   glab api --hostname <host> -X POST projects/<id>/merge_requests/<iid>/draft_notes -F note=@<finding file> \
     -F 'position={"position_type": "text", "base_sha": "<base_sha>", "start_sha": "<start_sha>", "head_sha": "<head_sha>", "old_path": "<old path>", "new_path": "<path>", "new_line": <line>}'
   ```

   An added line takes `new_line` alone; an unchanged line inside a hunk takes both `new_line` and its `old_line`. `old_path` differs from `new_path` only for a renamed file.
4. Add the summary as one more draft note, without `position`: `-F note=@<summary file>`.
5. Publish them together: `glab api --hostname <host> -X POST projects/<id>/merge_requests/<iid>/draft_notes/bulk_publish`. Leave out `reviewer_state`: its `requested_changes` value blocks the merge request, and the skills post no verdicts.
6. Read back with `feedback`: each finding is a `DiffNote` on its `new_path` and `new_line`, and the summary is there.

The review stays comment-only: `glab mr approve` is never used.

Capability: Supported

### reply

```bash
glab api --hostname <host> -X POST projects/<id>/merge_requests/<iid>/discussions/<discussion id>/notes -F body=@<reply file>
```

The note joins the thread. Read it back in that discussion with `feedback`.

Capability: Supported

### resolve-thread

```bash
glab api --hostname <host> -X PUT projects/<id>/merge_requests/<iid>/discussions/<discussion id> -F resolved=true
```

Only a resolvable thread resolves, and resolving takes the Developer role or authorship of the merge request. The response must show `resolved` true on every resolvable note.

Capability: Supported

### comment

```bash
glab api --hostname <host> -X POST projects/<id>/merge_requests/<iid>/notes -F body=@<comment file>
```

This creates a single comment rather than a resolvable thread, so it never blocks a project that requires every thread resolved. The response's `id` is the note id, and the comment's URL is `<web_url>#note_<note id>`. Read it back with `glab api --hostname <host> projects/<id>/merge_requests/<iid>/notes/<note id>`.

Capability: Supported

### merge

1. Run `read-pr` just before: `state` is `opened`, `sha` is the reviewed head, `detailed_merge_status` is `mergeable`, and `squash_on_merge` matches the style.
2. Merge, pinned to that head:

   ```bash
   glab api --hostname <host> -X PUT projects/<id>/merge_requests/<iid>/merge \
     -f sha=<reviewed head sha> -F should_remove_source_branch=false -F auto_merge=false
   ```

   Add `-F squash=true` when the style is `squash`. `sha` makes GitLab refuse with 409 when the head moved. `should_remove_source_branch=false` keeps the branch even when the merge request was created with "delete source branch" on. `auto_merge=false` merges now or fails; `merge_when_pipeline_succeeds` stays out. A 401 is missing permission, a 405 a merge request that cannot merge now (pipeline, threads, approvals, draft), a 409 a moved head, a 422 a failed merge. Report it as it came; never retry with other options.
3. Read back with `read-pr`: `state` is `merged` and `merge_commit_sha` is set (and `squash_commit_sha` for `squash`). The branch is still there: `glab api --hostname <host> projects/<id>/repository/branches/<branch>` answers.

Capability: Supported

### post-merge-ci

1. Take `merge_commit_sha` from `read-pr`.
2. List its pipelines on the base: `glab api --hostname <host> --paginate "projects/<id>/pipelines?sha=<merge sha>&ref=<base>&per_page=100"`. A pipeline can take a minute to appear.
3. Wait, and read the jobs, as `ci` steps 3 and 4 do.
4. When the merged diff touches none of the path filters of the base branch's jobs, no pipeline is expected: say so.

Capability: Supported

### attach

```bash
glab api --hostname <host> -X POST projects/<id>/uploads --form "file=@<file>"
```

The response holds `markdown`, such as `![ACM-42-login](/uploads/<secret>/ACM-42-login.png)`, which GitLab expands inside this project's descriptions and notes, and `full_path` (`/-/project/<id>/uploads/<secret>/<file>`). The permanent absolute URL, for links outside the project such as the tracker, is `https://<host>` followed by `full_path`. Viewing an upload in a private project takes access to the project. Read back: once the link is embedded, `read-pr` or `feedback` shows it.

Capability: Supported
