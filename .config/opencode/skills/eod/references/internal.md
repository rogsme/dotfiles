# Internal mode

The frank version for the internal team (the client's `internal_lead`, usually in Slack). Its job is to give the lead the real picture so they can manage the client: what actually shipped, what's at risk, which corners got cut, where the client version differs from reality, and what decision Roger needs from them.

Modeled on how Roger writes these himself: friendly opener, says up front it's the internal version, then the honest status, ending with a direct question to the lead.

## Inputs

1. Today's `<today>.notes.md` (dump, story restatement, PR facts) and `<today>.prs.json`. If they don't exist, treat the words after `internal` as the notes and run SKILL.md steps 2 and 3 first.
2. Today's client EOD `<today>.md` and its `## Internal notes`. Without one, still write the internal update and drop "What the client heard".
3. Yesterday's internal update: risks raised then, asks still unanswered.

## What changes from the client version

- **Technical is fine.** Ticket IDs, PR links, real component names, "staging", "text-to-SQL". One line per item, not the PR body.
- **Candid.** Cut corners, tech-debt tickets created, things that need tuning, flaky bits, cost (internal tooling billed to someone's own keys), what slipped and why. Every problem comes with what's being done about it: frank, not whiny.
- **Scope and money get named.** Work that might be outside the agreed scope, billing-relevant decisions Roger made solo, staffing or end-date timing against remaining work.
- **Still trimmed:** personal health detail stays one line; reference a colleague's summary ("re: your summary from the call") instead of pasting it back.
- **Same story.** The story restatement and its trades carry over (SKILL.md step 2).

## Shape

```
Good afternoon team! Internal update for <Client> :slightly_smiling_face: (client version already went out)

SHIPPED
• ACME-140 Accept rounded percentages (<PR url>): growth answers stop cutting off on rounding

IN FLIGHT
• ACME-118/129 (<PR url>): in my final review, merging tomorrow

RISKS AND CORNERS CUT
• Staging deploys silently failed for two days; fix merged, redeploy not verified yet

WHAT THE CLIENT HEARD
• Told them QA is still in progress; it's actually done, holding it until the video is ready

NEEDS A DECISION @<internal_lead>
• ACME-67 admin dashboard: the client flagged it as possibly out of scope, and it's now merged. Do we bill it or treat it as included?

<closing in Roger's voice>
```

- Drop empty sections. A quiet day can be SHIPPED plus one line.
- Bullets use `•`; headers are ALL CAPS without emojis. Emojis are Slack shortcodes (`:slightly_smiling_face:`, `:sweat_smile:`), one or two in the whole message.
- Every required PR (MERGED, OPENED, WORKED ON) gets a line: `TICKET-ID short title (url)`.
- Tag `@<internal_lead>` only on the line with a real ask or decision.
- "What the client heard" lists every place the client EOD softened, delayed, or left out something the lead should know. The lead can't get this anywhere else, so be precise.

## Check and deliver

1. Apply `de-ai-writing` and `avoid-ai-tropes` if installed, else the hard rules in `plain-language.md`.
2. Save to `~/.eod/<client>/<today>-internal.md` and run:
   `python3 <skill-dir>/scripts/check_eod.py ~/.eod/<client>/<today>-internal.md --mode internal --client ~/.eod/<client>/client.md --prs ~/.eod/<client>/<today>.prs.json`
   Internal mode allows ticket IDs, links and jargon, and still blocks dashes and AI tropes. Zero HARD findings.
3. Review and deliver as in SKILL.md steps 7 and 8, with `--mode internal`. The reader reads as the internal lead. Typical internal flags: an unverified "fixed" claim, or a decision that belongs in a DM rather than a channel post.
