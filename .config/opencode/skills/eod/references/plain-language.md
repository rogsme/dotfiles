# Plain language for a non-technical client

Roger's story comes first (SKILL.md step 2). Translate technical terms so the client can follow the work, and keep his voice, promises, trade-offs, pride, annoyance, and mood. The client also needs to know what they can use now, what is stuck, and what Roger needs from them; PR details support that story.

## Translation rules

- For supporting technical details, describe the effect on the person using the app. Preserve Roger's own framing of his day and why things happened.
- Swap jargon for the everyday thing it stands for (table below). If there's no everyday word, explain it in half a sentence the first time.
- Keep numbers Roger cited and their meaning, even when they describe engineering work. Translate their significance without silently dropping them; ask if a number is sensitive or unclear. Choose useful supporting numbers from PR descriptions ("30,000 figures, 36 exchange rates, all 50 markets", "946 articles searchable") rather than adding irrelevant hashes or limits.
- Keep safety and trust properties; clients care a lot about them: "it can only read the data, never change it", "each client only sees what they have access to", "it never guesses a number to fill the gap", "if something doesn't add up, it stops and tells us".
- One connected thought per bullet. An apology followed by "but" or "though" and its trade or defense is one thought; keep it together or explicitly link adjacent bullets. Distinct user-facing changes get their own explanations, even when all are awaiting review. If a PR did four unrelated things, keep the one or two the client would notice and call the rest "some housekeeping behind the scenes".
- Pure internal work (CI, review bots, refactors, codec cleanups) gets one brief behind-the-scenes line that carries its PR numbers: "Housekeeping to keep things steady (#153, #154)".
- Never imply the client slows you down. "A rare day with zero interruptions" reads as "you usually interrupt me", and their calls and bug reports are most of those interruptions. Say the day was focused and leave it there.
- Infrastructure hiccups: say what the client will notice and when it's back, not what broke on our side. "Publishing to the test site is paused, you'll see today's work tomorrow" is enough; "the automated checks stopped" only makes them wonder.

## Vocabulary

Generic terms that come up on most projects. Product-specific terms (what a feature is called in the client's world) belong in `~/.eod/<client>/client.md`, which wins over this table.

| Engineer says | Write |
|---|---|
| staging, staging env | the test site |
| production, prod | the live app |
| deploy / deployed | put up on the test site, is live on the test site |
| merged / PR merged | is now in the app (only if released); otherwise merged and waiting to go live |
| PR open, in review | still in progress, waiting on review (name whose review only if verified) |
| seed data, fixtures | the test site's sample data |
| ingestion, ETL, import job | importing the data, turning the file into usable data |
| migration, schema change | a behind-the-scenes change to how data is stored |
| rate limiting, quotas | usage limits |
| audit log, tracing | a record of who did what and when |
| auth, SSO, roles | logins, accounts, who can see what |
| security headers, CSP | the standard browser protections most sites use |
| prompt injection protection | keeps outside text separate from the AI's instructions, so it can't trick the AI |
| LLM provider outage | one of the AI providers the app runs on was down |
| single point of failure | if that one piece goes down, the whole app goes down with it |
| local dev env, test harness | practice copies of the app on my computer, never touching the real app |
| CI, tests green | the automated checks passed |
| AI code review, review bot | automated reviews |
| ticket, backlog, issue tracker | tasks, the to-do list (or just describe the work) |
| refactor, cleanup, tech debt | housekeeping behind the scenes |

## Before/after examples

These are the patterns that come up most. The client and details are made up; the moves are the point.

**Voice note:** "I got into a very productive ticket PR loop and I ran out of time, so I owe you the video. But I did finish the MCP server. Super busy day, but firing on all engines!"
**Story restatement (private):** "Roger owes the client the video: he got into a very productive ticket PR loop and ran out of time. But he did finish the MCP server, which is where the recording time went and the win he wants alongside the apology. Super busy day, but firing on all engines! Absent: annoyance, next delivery time."
**EOD (non-technical, PR merged):** "I got into a very productive loop of picking up tasks and getting changes ready, and I ran out of time, so I owe you the video. But I did finish the connection that lets your assistant use the app (#123); that's where the recording time went." The closing stays "Super busy day, but firing on all engines!" Debt and work share one bullet. If the PR is still open, keep the link, say it's still in progress, and flag the mismatch with his notes.

**PR description:** "Re-enables the review bot on every pull request... Adds a `REVIEW_EFFORT` setting..."
**EOD (if merged):** "Turned our automated code reviewer back on (#123)." If open: "Turning our automated code reviewer back on, still in progress (#123)." Costs stay private.

**PR description:** "Accept rounded percentages in answer validation"
**EOD:** "Growth answers now finish properly. Before, if the app wrote "4.2%" for a figure that's really 4.187%, it stopped the answer to be safe. It now accepts sensible rounding, but still stops if a number is actually wrong."

**PR description:** "Keep in-flight jobs alive through deploys, add timeouts, recover abandoned runs"
**EOD:** "Reports no longer get cut off when we update the app. Anything in progress gets to finish first, and if one ever gets stuck it shows up as "Incomplete" instead of spinning forever."

**Voice note:** "I deleted the old seed, I pushed the new seed"
**EOD:** "I hadn't refreshed the test site's sample data after this week's changes. I swapped in the new data and everything works as expected now."

**PR descriptions:** large workbook uploads and topic-aware research follow-ups, both open.
**Client draft:**

IN REVIEW 📋
Both changes are still in progress, waiting on review:
* Fixing the larger-file upload bug so your staff can upload a workbook with its supporting files through the app. A 12 MB delivery passed in local testing, but this still needs checking on the test site ([#201](https://github.com/example/portal/pull/201)).
* Helping research follow-ups stay on topic. If you ask "Why does it matter?" after an answer, the search will use the earlier conversation to understand what "it" refers to ([#202](https://github.com/example/portal/pull/202)).

The example and test size above are synthetic. In a real draft, use the gathered PR's evidence. Each bullet gives the client a different reason to care; the shared lead-in makes their identical review status clear without repeating it.

**PR risk section:** "38 rows fail validation against the totals sheet... Business confirmation is required"
**EOD (as an ask):** "When we imported the latest file, 38 totals didn't match the rows they're built from. We won't change your numbers on our own, so that file stays on hold until you let us know which figures are right."

**Voice note:** "the AI provider went down for two hours and I couldn't test anything"
**EOD:** a short "WHY THIS SLIPPED" section: what happened, how long, what it means for the plan, and (once) the bigger risk it exposed.

**Internal colleague summary with "easy wins / borderline / push back" buckets**
**EOD:** only the items the client asked for, phrased as their requests ("A few examples: adding your logo to the reports, and defaulting to the full date range"). Nothing gets turned down in writing.

## Hard writing rules (apply even if the cleanup skills aren't installed)

1. No em dashes or en dashes, and no hyphen or double hyphen standing in for one. Use commas, colons, semicolons, periods, or parentheses, and vary them.
2. No negative parallelism: "it's not just X, it's Y", "this isn't about X, it's about Y", "not because X but because Y".
3. No fake suspense or self-answered questions: "Here's the thing", "The result? ...", "Not X. Not Y. Just Z."
4. No signposted wrap-ups: "In short", "Overall," as a reflex, "To sum up".
5. No bold-label bullets and no bold-label paragraphs.
6. No stock AI vocabulary: delve, leverage, robust, seamless, streamline, harness, pivotal, crucial, vital, testament, landscape, game-changer, "plays a key role".
7. No trailing "-ing" commentary: ", highlighting...", ", underscoring...", ", paving the way for...".
8. At most one list of three per update. Vary sentence length. Contractions are good.
9. Keep Roger's voice: casual, direct, a little excited when things work, honest when they don't. He says "super", "a bunch", "haha", "finally!". Don't make him sound like a press release, and don't overdo his slang either.

## Roger's usual typos to fix in what you carry over

"trough" → "through", "loose" → "lose", lowercase "i" → "I", "its" vs "it's", "on the loop" → "in the loop", "on heavy development" → "in heavy development", missing comma after greetings.
