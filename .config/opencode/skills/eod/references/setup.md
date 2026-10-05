# Setup mode

Adds a client, edits one, or archives one. Writes `~/.eod/<client>/client.md` from `<skill-dir>/templates/client.md`. Setup happens a few times a year, so make it quick: discover what you can, ask only the rest, show a short summary at the end.

## Which path

- `setup` with no name, or a name with no folder → **new client**.
- `setup <client>` and the folder exists → **edit**: summarize the current config in five lines or fewer, ask what changed, edit only that.
- `setup <client> archive` → set `status: archived` and say so. Logs stay. Archived clients are skipped by auto-detect; `<client> ...` and `weekly <client>` still work when named explicitly (useful for a last weekly after rolling off).
- A daily EOD from a repo that matches no client → offer setup in one line before going further.

## New client

### 1. Discover first (no questions yet)

From the current repo, if there is one:
- `git remote get-url origin` → `repos:` (as `owner/name`).
- `gh pr list --state all --limit 40 --json title,headRefName,author` → ticket prefixes (patterns like `ABC-123`) for `ticket_prefixes:`, and whether PRs come from Roger's account or a bot/agent account (add those to `pr_authors:` so the daily PR pull finds them).
- README, `CONTEXT.md`, `AGENTS.md`, `docs/` index: what the product is and the domain terms engineers use. Read the first screen of each, not whole trees.

Draft a slug from the client name in kebab-case (`acme-corp`).

### 2. Ask what can't be discovered

One round of multiple-choice questions with the question tool, four max:

1. **How technical are the readers?** non-technical (translate everything) / mixed (plain language, light terms OK) / technical (tickets and component names OK)
2. **Where does the EOD go?** Microsoft Teams chat / Slack / Email / Other
3. **Who's the internal lead for internal updates?** offer names from memory or recent context if known, plus Other
4. **Weekly recap on Fridays?** Yes / No

Then one free-text ask, inviting a voice dump: "Talk me through the client like you would a new teammate: who reads the updates (names and roles), what the product does in their words, anything that must never show up in an update (contract terms, rates, roll-off dates, other clients), and any decisions already made about how we talk to them."

### 3. Draft the vocabulary

From the repo docs plus his answer, propose 8 to 15 rows of `internal term | client words`, pitched at the readers' level. A `technical` client may need only a few rows (or none). Reuse rows from `plain-language.md` only when they apply to this product.

### 4. Write and confirm

1. Fill the template and write `~/.eod/<client>/client.md`.
2. Show Roger a summary, not the file: readers and level, channel, header line, internal lead, weekly yes/no, vocabulary row count, never-mention count. Plus the path.
3. Offer once: "Want a test EOD from today's merged PRs so you can check the voice?" If yes, run the daily flow with the PRs as notes and mark it as a test (save it as `<today>-test.md` so it doesn't pollute continuity).

## Rules

- Never copy one client's vocabulary, people, or standing decisions into another client's file.
- Never-mention items should be specific phrases ("contract end date", "day rate"), not common words, or the checker will block normal sentences.
- Don't put credentials, rates, or contract amounts in the file. If Roger mentions them, record only "never mention pricing" in the never-mention list.
