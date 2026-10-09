# Ticket pass

Used in SKILL.md step 3 when `client.md` has a `tracker:`. Tickets are supporting detail like PRs: Roger's notes still tell the story. The tracker is read-only to you; when Roger wants a ticket changed, tell him which one and what to change.

## Config

```yaml
tracker: linear                       # or jira, ...
tracker_via: mcp:linear-madison-and-wall   # mcp:<server> or cli:<command>
tracker_team: Madison And Wall
```

`linear` over `mcp:<server>` is the one recipe written so far: the server's `list_issues`, `get_issue`, `list_comments` and `get_user` tools. `list_issues` filters `createdAt` and `updatedAt` mean "on or after" and take an ISO timestamp. For any other tracker, read what its tools or `--help` offer, gather the same buckets, and tell Roger in "Before you send" that its recipe isn't written yet.

## Light pass (every run)

"Today" starts at `from_utc` in `<today>.prs.json`. Gather three buckets:

- **LINKED**: tickets named in the titles or bodies of today's required PRs (IDs with the client's `ticket_prefixes`). Fetch each with `get_issue`.
- **CREATED**: `list_issues` with `team`, `createdAt: <from_utc>`, fields `id,title,status,statusType,url,createdAt,createdBy,assignee,labels`; keep the ones Roger (`me`) created.
- **COMPLETED**: `list_issues` with `team`, `assignee: "me"`, `updatedAt: <from_utc>`, fields as above plus `completedAt`; keep the ones whose `completedAt` is today.

Weekly mode uses Monday's start instead of `from_utc` and skips LINKED.

## Deeper, when the notes ask

- A ticket ID in the notes: `get_issue` it into a **MENTIONED** bucket.
- "created tickets", "wrote up", "scoped", "broke it down": the CREATED bucket is now part of the story.
- A topic for tomorrow ("pick up the export stuff"): search Roger's open tickets for it and use the matches to make the plan concrete.
- "blocked", "waiting on", or a discussion on a ticket: read its comments.

## Save

Write `~/.eod/<client>/<today>.tickets.json`:

```json
{"date": "2026-10-09", "tracker": "linear", "from": "<from_utc>",
 "buckets": {"LINKED": [], "CREATED": [], "COMPLETED": [], "MENTIONED": []},
 "unavailable": null}
```

Each ticket: `id`, `title`, `status`, `url`, plus `pr` (repo#number) for LINKED. Append one line per ticket to `<today>.notes.md` next to the PR lines. If the tracker can't be reached (server not connected, auth expired), set `unavailable` to the error, say so in "Before you send", and carry on without it.

## What each bucket feeds

- **Status check.** A LINKED ticket whose status disagrees with its PR (PR merged, ticket still "In Progress"; PR open, ticket "Done") is an FYI line in "Before you send". The PR's real state still decides what the client hears.
- **Client EOD.** Ticket titles in the client's words, never IDs (unless the client is `technical`). CREATED reaches the client only when the notes bring up new tickets or planning: then one plain line, such as "Mapped out the next pieces: the export button and the saved charts". A COMPLETED ticket with no PR today counts as work done only when the notes mention it.
- **Internal update.** NEW TICKETS lists CREATED with ID, title and URL; tech-debt tickets say so. Status mismatches go under RISKS AND CORNERS CUT.
- **Weekly.** COMPLETED and CREATED for the week shape the themes and the "what's next" line.
- **Reviewers** get the `.tickets.json` path with the other inputs.
