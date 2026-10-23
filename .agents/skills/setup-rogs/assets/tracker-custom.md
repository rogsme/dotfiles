# Tracker guide: Custom

## Setup notes

For setup-rogs only; this section is not copied into the project. A skeleton for a tracker without a built-in guide, filled from the user's own description.

- Detect: the user names a tracker that no built-in guide covers, or a built-in guide's connection check shows the project uses something else.
- Ask: one question per operation, in the order of `## Operations`. Each question quotes the operation's contract from `references/contract.md` and the `{{FILL: ...}}` text below, which lists what the answer must give: the exact tool or command with its parameters, the ids it needs, how its pagination ends, and how to read the result back. Move to the next operation only when the current answer is complete.
- Connection check: run the `resolve` and `load` the user described on one ticket the user names, and compare the result with what the user sees in the tracker. Check `search`, `list-in-flight`, `list-ready` and `metadata` live the same way. When the connection is missing (no tools, CLI or credentials in this session), the user sets it up in their own harness or environment and runs `/setup-rogs` again; a read the session still cannot run stays unchecked, and the report says so. Setup runs reads only; each write is confirmed the first time a lifecycle skill makes it and reads it back.
- Discover: run the described `metadata` to fill `## States` and `## Labels and priority`, and ask for whatever it cannot read.
- States: ask where each role lives: native states, labels, a field, or open and closed. A tracker without native states maps the roles to whatever it has, under the contract's rule for trackers without native states.
- Priority: ask for the tracker's native priority values and map P0 to P3 onto them; when it has none, ask whether labels carry priority.
- Bundles: ask for the relation that links bundle members; when the tracker has no relations, write that the `Delivers with:` lines alone encode a bundle.
- Gaps: an operation the tracker cannot perform gets `Capability: Unsupported`, or `Capability: Fallback: <what to do instead>` when one of the contract's gap rules fits: `attach` (upload to the forge only), `relate` (the `Blocked by:` and `Delivers with:` lines alone), comment edits (a new comment that links the one it supersedes), and search that misses archived tickets (search what is visible and state the limit). `resolve`, `load`, `list-in-flight`, `list-ready`, `metadata`, `create`, `update` and `transition` have no gap rule: a skill that needs one of them and finds it Unsupported stops with `Status: BLOCKED`, so tell the user which skills that stops, from the contract's "Which skill needs what" table.
- Unknown operations: write a procedure only from the user's description and what setup observed. An operation the user cannot describe is handled as one the tracker cannot perform (see Gaps), with the body "Not described at setup."; running `/setup-rogs` again with a description replaces it.
- Ticket ids: branch and directory names carry the id, so it holds only letters, digits and hyphens. When the tracker's own ids do not (for example `#123`), choose a key with the user and write ids as `<key>-<number>`.

## Tracker

- Kind: {{FILL: the tracker's name}}
- Connection: {{FILL: how every call reaches the tracker: an MCP server name, a CLI with the flags that pin host and project, an API base URL with the name of the environment variable that holds the token (never the token itself), or a directory; and which one to use when the session has several connections to this kind of tracker}}
- Scope: {{FILL: the workspace, team or project this repository uses, each with its name and id}}
- Ticket ids: {{FILL: the id format with an example, and a regular expression that matches one whole id}}
- Ticket URLs: {{FILL: the ticket URL format, or "none"}}
- Rules for every call: {{FILL: rules such as "writes take the native id, never the display number", or "none"}}

## Operations

### resolve

{{FILL: how to turn a ticket id, a bare number or a ticket URL into what the other calls need: the exact tool or command with its parameters, the field that holds the native id when writes need one, and how to confirm the ticket belongs to the configured scope}}

Capability: {{FILL: Supported, or Fallback: <what to do instead>, or Unsupported}}

### load

{{FILL: the calls that read the description, state, labels, priority, assignee, relations with each related ticket's state, attachments and every comment, with each call's pagination and how to tell the last page}}

Capability: {{FILL: Supported, or Fallback: <what to do instead>, or Unsupported}}

### search

{{FILL: the call that searches titles and descriptions across open, closed and archived tickets, with its parameters, its pagination, any cap on results, and any tickets it cannot see}}

Capability: {{FILL: Supported, or Fallback: <what to do instead>, or Unsupported}}

### list-in-flight

{{FILL: the call that lists the tickets in the in-progress and in-review states, with its filter parameters and pagination}}

Capability: {{FILL: Supported, or Fallback: <what to do instead>, or Unsupported}}

### list-ready

{{FILL: the call that lists the tickets in the new and ready states, with its filter parameters and pagination}}

Capability: {{FILL: Supported, or Fallback: <what to do instead>, or Unsupported}}

### metadata

{{FILL: the calls that list states, labels, members and projects, each with its pagination}}

Capability: {{FILL: Supported, or Fallback: <what to do instead>, or Unsupported}}

### create

{{FILL: the call that creates a ticket with title, description, state, priority, labels, assignee and project; the format each field takes; where the response holds the new id and URL; and the call that reads the ticket back}}

Capability: {{FILL: Supported, or Fallback: <what to do instead>, or Unsupported}}

### update

{{FILL: the call that changes the description and other fields; whether a description write replaces the whole text; whether a label write replaces the whole set or adds and removes single labels; and the read-back}}

Capability: {{FILL: Supported, or Fallback: <what to do instead>, or Unsupported}}

### relate

{{FILL: the calls that add blocked-by, related and parent relations; which of them the tracker lacks; whether adding is append-only and how to remove a relation; and the read-back}}

Capability: {{FILL: Supported, or Fallback: <what to do instead>, or Unsupported}}

### comment

{{FILL: how to list a ticket's comments with pagination, edit one, and create one; who may edit a comment; and the read-back. The lifecycle finds a comment by its first line, a heading such as "## Implementation handoff", and edits it in place of posting a duplicate}}

Capability: {{FILL: Supported, or Fallback: <what to do instead>, or Unsupported}}

### transition

{{FILL: the call that moves a ticket to a state, what it takes (a state name, an id or a column), any extra step such as closing or reopening, and the read-back that shows the new state}}

Capability: {{FILL: Supported, or Fallback: <what to do instead>, or Unsupported}}

### attach

{{FILL: the call that uploads a file to a ticket, its size and type limits, where the response holds the file's URL, and whether that URL stays valid or expires}}

Capability: {{FILL: Supported, or Fallback: <what to do instead>, or Unsupported}}
