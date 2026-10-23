# Tracker guide: Kaneo

## Setup notes

For setup-rogs only; this section is not copied into the project. Kaneo through an MCP server: the instance's built-in endpoint or the `@kaneo/mcp` stdio package.

- Detect: an MCP server entry in a harness config whose URL ends in `/api/mcp` on a Kaneo host, or one that runs `@kaneo/mcp`; ticket ids such as `ACM-12` that match a Kaneo project's key; links to the Kaneo web app in docs or templates; tools such as `list_project_columns` and `create_task_relation` in the session.
- Connection check: ask which MCP server belongs to this project (for example `kaneo-acme`), then call that server's `get_project` with `id: "<project id>"`. Success returns the project's name and slug. Failure is one of: the tools are missing from the session (not connected, or not signed in), an authorization error, or a project the account cannot see. To add it, the user puts a remote MCP server with the URL `<Kaneo host>/api/mcp` in their own harness config and signs in when the harness asks, or adds the stdio package `@kaneo/mcp` with `KANEO_API_URL` set to the host (`KANEO_API_KEY` skips the browser sign-in). Setup records only the server name and the host.
- Tools: Kaneo releases differ in the tools they offer; `get_task_by_ticket_id`, for one, is missing from older ones. Map every operation below to the tools the session lists, rename any that differ, and where a tool is missing use the alternative the operation gives or the contract's gap rule.
- Discover: run the calls in `metadata`. `list_workspaces` gives the workspace id; in the `list_projects` result, the project's `slug` is the key in ticket ids, so confirm it by resolving one existing ticket id. For `Ticket URLs`, ask the user to paste one task's URL from the browser and record its pattern.
- States: each state is a column slug. The usual map: new is `to-do`; ready is none; in-progress is `in-progress`; in-review is `in-review`; done is `done`; canceled is a column such as `cancelled` when the project has one, otherwise ask; blocked is none unless a column exists. A column flagged `isFinal` is terminal. `planned` and `archived` are statuses outside the board's columns: ask before mapping a role to either.
- Automation: Kaneo's forge integrations can create tasks from forge issues and sync their labels and states. Ask whether one is connected to this project and record what it moves under Automation, or "none".
- Priority: `urgent`, `high`, `medium`, `low` and `no-priority`. Map P0 to `urgent`, P1 to `high`, P2 to `medium` and P3 to `low`.
- Bundles: `related`, unless the pair already has `blocks`. When the server's `create_task_relation` rejects `related`, write that the `Delivers with:` lines alone encode a bundle.
- Gaps: no tool uploads files, so `attach` is Unsupported and the contract's rule for a tracker that cannot attach applies; when the session lists an upload tool, describe it in `attach` and mark it Supported. `search` returns one page of at most 50 results, so the operation completes it from the full task listing. Without `update_task_comment`, the contract's rule for comments that cannot be edited applies.
- Verify on first use: that `list_workspace_labels` rows carry `taskId`; that `create_task_relation` accepts `related`; that `list_project_columns` returns `isFinal`; whether `list_tasks` entries flagged `descriptionDeferred` leave their description out; that `update_task_status` accepts `archived` when canceled maps to it.

## Tracker

- Kind: Kaneo
- Connection: the MCP server `{{FILL: MCP server name, for example kaneo-acme}}`, connected to the Kaneo instance at `{{FILL: Kaneo host, for example https://kaneo.example.com}}`. Harnesses prefix each tool with its server's name (`mcp__<server>__<tool>` in Claude Code, `<server>_<tool>` in OpenCode); the operations below give bare tool names. Call only this server's tools.
- Workspace: {{FILL: workspace name}}, id `{{FILL: workspace id}}`
- Project: {{FILL: project name}}, id `{{FILL: project id}}`, key `{{FILL: project key}}`
- Ticket ids: `{{FILL: project key}}-<number>`, matched by `^{{FILL: project key}}-[1-9][0-9]*$`, where `<number>` is the task's `number` field. Apart from `get_task_by_ticket_id`, every tool takes the task's native `id`, an opaque string, never the number; `resolve` turns a ticket id into it.
- Ticket URLs: {{FILL: the task URL pattern this instance shows in the browser, for example `https://kaneo.example.com/<workspace slug>/task/<ticket id>`}}
- A task's status is the slug of one of the project's columns.
- Listing tasks: `list_tasks` returns one page as `data.columns[].tasks`, with that page's archived and planned tasks in `data.archivedTasks` and `data.plannedTasks`. Pass `page` from 1 up to `pagination.totalPages`, with `limit` up to 100.
- `externalLinks` on a task point at forge issues and pull requests; their numbers are never task numbers.

## Operations

Angle brackets mark values: identity values come from `## Tracker`, the rest from earlier calls.

### resolve

Take the ticket id or native id from a task URL, or put the key in front of a bare number. Then:

- With `get_task_by_ticket_id` in the session: call it with `ticketId: "<ticket id>"` and `projectId: "<project id>"`.
- Without it: `list_tasks` with `projectId: "<project id>"`, `sortBy: "number"`, `sortOrder: "asc"` and `limit: 100`, page by page to the last, and take the task whose `number` equals the number exactly.
- A native id: `get_task` with `taskId: "<native id>"`.

Require the task's `projectId` to equal `<project id>`. Keep its native `id`: every later call takes it.

Capability: Supported

### load

1. `get_task` with `taskId: "<native id>"`: title, description, status, priority, assignee (`userId`, `assigneeName`) and project. It carries no labels and no relations.
2. Labels: `list_workspace_labels` with `workspaceId: "<workspace id>"`; the task's labels are the rows whose `taskId` is its native id.
3. Relations: `get_task_relations` with `taskId`. Each relation has an `id`, a `relationType`, a `sourceTaskId` and a `targetTaskId`: in `blocks` the source blocks the target, in `subtask` the source is the parent, and `related` runs both ways. Call `get_task` on each related task for its `number`, title and status.
4. Comments: `list_task_comments` with `taskId` returns every comment, oldest first, in one response.
5. Attachments: the tools list none; files appear only as links in the description and comments.

Capability: Supported

### search

1. `search` with `q: "<terms>"`, `type: "tasks"`, `projectId: "<project id>"` and `limit: 50`, once per set of terms. It returns one page of at most 50 results and offers no further pages.
2. Complete it from the full listing: read every page of `list_tasks` for the project once, archived and planned tasks included, and check each task's `title` and `description` for each term, ignoring case.

Together they cover open, done, canceled and archived tasks.

Capability: Supported

### list-in-flight

`list_tasks` with `projectId: "<project id>"` and `status: "<in-progress slug>"`, every page; then the same with the in-review slug.

Capability: Supported

### list-ready

`list_tasks` with `projectId: "<project id>"` and `status: "<new slug>"`, every page; then the same with the ready slug, when `## States` maps one.

Capability: Supported

### metadata

- States: `list_project_columns` with `projectId`; each column's `slug` is the status value that `create_task` and `update_task_status` take.
- Labels: `list_workspace_labels` with `workspaceId`. Rows with no `taskId` are the workspace's labels; rows with a `taskId` are copies on tasks, so one name appears many times.
- Members: `list_workspace_members` with `workspaceId`; their user ids are what `userId` takes.
- Projects: `list_projects` with `workspaceId`.
- The connected user: `whoami`.

Capability: Supported

### create

`create_task` with `projectId`, `title`, `description` (markdown, possibly empty), `status` (the new state's slug) and `priority` (`urgent`, `high`, `medium`, `low` or `no-priority`), all required, plus `userId` for an assignee. Add labels afterwards as `update` does. Record the returned native `id` and `number`; the ticket id is `<project key>-<number>`. Read the task back with `get_task`.

Capability: Supported

### update

- Fields: `update_task` with `taskId` and only the fields that change (`title`, `description`, `status`, `priority`, `userId`). It merges them onto the current task, so omitted fields keep their values. `description` replaces the whole text: read it, change it, and send all of it. `update_task_assignee` with `userId` (or `null` to unassign) changes only the assignee.
- Labels change one at a time; no call replaces the set. To add one, call `attach_label_to_task` with `taskId` and the `labelId` of the workspace row (the one with no `taskId`) that has the label's name; Kaneo puts a copy on the task. Attaching a row that belongs to another task moves the label off that task, so always attach the workspace row. To remove one, call `detach_label_from_task` with the `labelId` of the row whose `taskId` is this task.
- Read back with `get_task` and `list_workspace_labels`.

Capability: Supported

### relate

`create_task_relation` with `sourceTaskId`, `targetTaskId` and `relationType`:

- Blocked by: `blocks`, with the blocker as source and the blocked task as target.
- Parent: `subtask`, with the parent as source and the child as target.
- Related: `related`, in either direction.

Read `get_task_relations` first and keep a relation the pair already has rather than adding another. Remove one with `delete_task_relation` and its `id`. Read both tasks back with `get_task_relations`.

Capability: Supported

### comment

1. `list_task_comments` with `taskId`, and find the comment whose content's first line is the heading, for example `## Implementation handoff`; when several match, take the newest (the last in the list).
2. Found: `update_task_comment` with `commentId` and the complete new `content`; the edit replaces the whole text. Kaneo lets only the author edit a comment: when the edit is refused, or the session has no `update_task_comment`, post a new comment under the same heading whose second line names the date of the comment it supersedes.
3. Not found: `create_task_comment` with `taskId` and `content`.
4. Read the comment back with `list_task_comments`.

Capability: Supported

### transition

`update_task_status` with `taskId` and the column slug mapped to the role. Read back with `get_task`: `status` must equal the slug.

Capability: Supported

### attach

Kaneo's MCP tools upload no files.

Capability: Unsupported
