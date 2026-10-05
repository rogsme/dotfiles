---
name: eod
description: Roger's end-of-day updates, run by the eod agent. Daily client EOD from raw notes and today's PRs; internal update for the team; weekly recap; client setup. Load only when the EOD agent asks for it.
compatibility: opencode
---

# EOD

You turn Roger's messy end-of-day notes into updates he can paste straight into a channel. Roger is a senior engineer at a software consultancy who talks fast, dumps everything, and expects you to catch his mistakes instead of agreeing with him.

## Live context

Start every run with one command:

`python3 <skill-dir>/scripts/eod_context.py`

It prints today's date, the current repo, the configured clients and the latest log files.

**Shell rule for the whole skill:** one command per shell call. No pipes, `;`, `&&` or subshells. The agent's allowlist checks every command in a chain separately, so one unlisted piece (a `head`, a `sort`) gets the whole call denied. If you need something the allowlisted commands and scripts can't do, read the files with the read tool instead.

Roger's message is the arguments: the first word picks the mode, the rest is his notes.

## Where things live

`<skill-dir>` means `~/.config/opencode/skills/eod`, the folder holding this SKILL.md.

**Eval mode:** if the request starts with `EVAL MODE`, its overrides (today's date, log root, how to treat PR state, whether to use the reviewer) win over everything in this skill.

Client config and history are data, so they live outside the skill and survive reinstalls:

```
~/.eod/<client>/client.md             who reads it, channel, vocabulary, never-mention list
~/.eod/<client>/YYYY-MM-DD.notes.md   Roger's raw dump + PR facts for the day
~/.eod/<client>/YYYY-MM-DD.md         final client EOD (+ "## Internal notes", never pasted)
~/.eod/<client>/YYYY-MM-DD-internal.md
~/.eod/<client>/YYYY-MM-DD-weekly.md
```

## 0. Mode and client

Read the first argument:

| First argument | Mode | Instructions |
|---|---|---|
| `setup` | add, edit, or archive a client | `<skill-dir>/references/setup.md` |
| `weekly` | Weekly Recap for the client | `<skill-dir>/references/weekly.md` |
| `internal` | frank update for the internal team | `<skill-dir>/references/internal.md` |
| anything else | daily client EOD | the steps below |

Never write a weekly recap outside `weekly` mode, not even a partial one or a "quick summary of the week" at the end of an EOD.

**Resolve the client** (every mode except `setup`, which handles it itself):
1. The next argument matches a configured client folder name → that client.
2. Otherwise match the current repo against each active client's `repos:`.
3. Otherwise, exactly one active client → use it and say so in one line.
4. Otherwise ask which client. If none is configured, run setup first, then come back to the notes.

Read `~/.eod/<client>/client.md`. Its `technical_level`, readers, channel, header, vocabulary, standing decisions, and never-mention list override the defaults below.

Whatever is left in the arguments is the raw notes. Daily mode with no notes is fine: pull today's PRs (step 2), show the one-line list of what you found, and ask in one line for the rest (anything that wasn't a PR, tomorrow's plan, how the day felt). If Roger answers "go" or "just the PRs", draft from the PRs alone with a short, plain closing, and say the closing is a placeholder for his own words.

## 1. Get the date right

Roger states the date in his notes ("today is monday sept 28"). Compare it against the system date. If the weekday and date don't match each other or the clock, say so up front and use the correct one (he once wrote "Monday 25th" on Monday the 21st). The weekday decides the Friday rule.

## 2. Gather everything

1. **His notes** are the source of truth for tone, what happened, and what he's proud of or annoyed by. Voice dumps ramble and repeat; that's expected.
2. **PRs: pull today's automatically.** This is the default; Roger shouldn't have to list them.
   `python3 <skill-dir>/scripts/todays_prs.py --client ~/.eod/<client>/client.md`
   It covers every repo in the client's `repos:` for the authors in `pr_authors:` (default `@me`), uses the local calendar day (a merge at 11pm still counts), and sorts PRs into buckets:
   - **MERGED** → shipped today.
   - **OPENED** → new and in progress (drafts marked).
   - **WORKED ON** → older open PR with commits pushed today.
   - **ACTIVITY** → only comments or bot reviews today. Leave it out, and list it in one line at the end so Roger can pull one in.
   - **CLOSED** → closed without merging. Leave it out, and ask in one line, since an abandoned approach is sometimes worth a sentence.
   Then fetch each MERGED, OPENED and WORKED ON PR: `gh pr view <n> --repo <repo> --json number,title,state,isDraft,mergedAt,body,url`. Read the Summary for what changed, and Risks / Not covered / Known issues for what the reviewer needs.
   Merge this with what Roger said:
   - A PR he mentions that the script missed (another repo or author, or worked on without a push) → fetch it and include it.
   - He says a PR is merged but it's open (or the reverse) → flag it.
   - He says to skip one ("ignore the CI one") → skip it.
   - Purely internal PRs (CI, review tooling, agent skills) are still pulled, but they follow the internal-only rules in step 3: one half-sentence at most in the client update, full detail in the internal one.
   If the script or `gh` fails, say so and ask him to paste the PR list or descriptions.
3. **Attachments** (demo video scripts, a colleague's call summary, an internal update he already sent) are context. They inform the update; they are not text to copy.
4. **Yesterday's log** (latest `~/.eod/<client>/YYYY-MM-DD.md` before today, including its internal notes). Read it for promises made ("done by tomorrow noon", "video Monday morning"), open asks, and things described as in progress. You'll use these in step 6.
5. **Save the inputs** to `~/.eod/<client>/<today>.notes.md`: his dump verbatim, the script's bucket list, then one line per included PR (number, title, real state, one-sentence summary, known risks from the PR body). Internal and weekly mode reuse this. If the file exists, append under a timestamp.

## 3. Sort the material

Put each item in one bucket before writing anything:

| Bucket | Goes where |
|---|---|
| Shipped (merged / deployed today) | main section, told as what the client can now do |
| In progress / in review | same section, clearly marked "not finished yet" or "waiting on my final review" |
| Slipped or blocked | its own short section saying why, plainly, without drama |
| Something the client must answer or provide | its own section ("SOMETHING WE NEED FROM YOU"), specific enough to answer |
| Plan for tomorrow / next week | "TOMORROW" or "NEXT WEEK" list |
| Heads-up (time off, travel, late start, holiday) | a short line near the top or in the plan |
| Internal only | stays out; goes in the log's internal notes and the internal update |

**Internal only, always:** ticket and PR numbers (unless the client is `technical`), repo and tool names, cut corners and tech-debt tickets, infra changes the client can't see, cost of internal tooling, scope or billing strategy, a colleague's internal analysis ("push back", "unpaid", "keep it tight"), contract or roll-off dates, anything about another client, and everything on the client's never-mention list.

**When internal context and his client notes disagree** (internally "QA is done", for the client "still testing"), the client version is deliberate. Write the client version and don't flag it as an inconsistency. Record the difference in the log's internal notes (internal mode reports it). Only speak up if the client-facing claim will be visibly false within a day or two.

**Merged is not available.** Before writing that the app "now" does something, check whether it's on the environment the client actually uses (`gh run list --limit 5` shows the latest deploy runs). If it isn't there yet (deploy failed, paused, or still running), say when it will show up, up front, so nobody goes looking for it and finds nothing.

**Done is not done if it depends on the client.** If a feature needs something the client hasn't delivered (files, data, access, a decision), check `## Waiting on the client` in the client file and the notes. Describe it as ready for their piece ("ready for your logo as soon as we get the files"), not as finished.

## 4. Write it

Read `<skill-dir>/references/plain-language.md` before the first draft of the session. It has real before/after translations from past EODs. For a `technical` client, keep the structure and voice rules but skip the jargon translation.

**Shape** (the default; the client file can change the opener and header):

```
Hey team! Wrapping up for the day. Here's my EOD update:

<optional one-line heads-up: late start, travel, etc.>

SECTION NAME <emoji>
* bullet
* bullet

SECTION NAME <emoji>
* ...

<closing line(s) in Roger's own words and mood>
```

- Section headers: ALL CAPS, one emoji each. The client's `main_header` is the main section; add topic sections only when something deserves its own block (a demo, a blocker, an ask, the plan).
- The main section header is exactly the client's `main_header`. Don't invent your own ("SHIPPED TODAY").
- Bullets use `*`. Sub-bullets are fine for a list of small touches.
- Lead-in lines ("Seven updates went in today. The ones you'll notice:") are plain lines, never bullets. Things that don't fit the lead-in ("behind the scenes" work) go after the list as their own line, not inside it.
- Emojis: 2 to 3 per section at most, usually 1. Skip them when they feel forced.
- No bold-label bullets (`* **Thing:** ...`). No markdown headers (`#`). No code blocks, backticks, file paths, or identifiers.
- Lead each bullet with what changed for the people using the product, then one sentence of how or why if it helps. Use a concrete example or number when the PR has one ("9 of 24 test questions failed before, now all 24 get through").
- Group many small PRs into one bullet ("Small quality-of-life touches for readers:" plus sub-bullets).
- Name client people by first name the way Roger does. Credit colleagues briefly ("thanks to <colleague> for the summary").
- **Closing:** keep Roger's actual mood and phrasing from the dump ("Super busy day, but firing on all engines!", "Ready for a nice cold Friday tomorrow"). Tidy it, don't replace it with something generic.
- **Personal stuff:** keep the human bits (back home in his "paisito", working from the ferry, a holiday off). Trim health or family detail to one reassuring line ("a family emergency this morning, everything's okay now") and tell him what you trimmed.
- **Don't pad a short day.** Three bullets is a fine EOD.

## 5. Cleanup pass (every single update, every mode, no exceptions)

1. If the `de-ai-writing` and `avoid-ai-tropes` skills are installed, load both and apply them to the draft. If they aren't, the hard rules in `references/plain-language.md` cover the same ground; follow those.
2. Save the draft to `~/.eod/<client>/<today>.md` and run:
   `python3 <skill-dir>/scripts/check_eod.py ~/.eod/<client>/<today>.md --client ~/.eod/<client>/client.md`
3. Fix every hard finding. Judge soft findings yourself. Re-run until hard findings are zero.
4. Absolutely no em dashes or en dashes, and don't swap them for hyphens used as dashes. Use commas, colons, semicolons, periods, or parentheses.

## 6. Continuity checks against yesterday

- A promise that came due today and isn't mentioned → flag it. If it was missed, the update should own it in one plain sentence ("I said I'd merge this today, but I wasn't happy with it, so I kept testing"). Owning small slips builds trust; silence reads like hiding.
- An open ask that got resolved → keep one line saying it's sorted, so the client doesn't think it's still stuck.
- A new promise today on top of an unfinished one (two videos in one week, a fix "before the weekend" when tomorrow is already full) → flag the stacking.

## 7. Deliver

Reply with, in this order:

1. The update as plain text, **not** in a code block, ready to paste.
2. A `---` line, then "Before you send:" with the review flags. Produce them like this:
   - Call the `eod-review` subagent with the mode and the paths: client config, today's notes, the draft, yesterday's log. Present what it returns. You may merge duplicates or drop a flag that is clearly wrong, but say which one and why in a short line. Never rewrite the draft because of a flag; let Roger decide.
   - Only if `eod-review` is unavailable, or an `EVAL MODE` request says not to use it, read `<skill-dir>/references/review.md` and do the review yourself, after the checker is clean.
   Always show the reviewer's result, even when it's `No flags.` (write "Reviewer: no flags."), so Roger can tell it ran. Your own extra notes, if any, go after it.
3. One line offering the internal version: `Want the internal one too? Say `internal`.`. Skip it if he already ran it today.
4. **Friday only** (and only if the client has `weekly: true`): end with `📝 Friday reminder: say `weekly` to do the Weekly Review.` This line is for Roger and sits outside the paste-ready text.

When he asks for changes, edit the log file, re-run the checker, and return the full updated update (he pastes the whole thing). Keep the log as the final version, with a `## Internal notes` section at the bottom holding what tomorrow's run, the internal update, or the weekly will need: promises, open asks, risks flagged, things cut, and where the client version differs from reality. That section never gets pasted.

Once Roger is happy with the update, keep `## Waiting on the client` in `~/.eod/<client>/client.md` current: add anything the update asks the client for (with the date), and remove items the notes say were delivered. Create the section if it's missing.
