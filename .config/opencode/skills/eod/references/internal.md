# Internal mode

The frank version for the internal team (the client's `internal_lead`, usually in Slack). Its job is to give the lead the real picture so they can manage the client: what actually shipped, what's at risk, which corners got cut, where the client version differs from reality, and what decision Roger needs from them.

Modeled on how Roger writes these himself: friendly opener, says up front it's the internal version, then the honest status (what's really done, which corners got cut and that tickets exist for them, what still needs tuning), ending with a direct question to the lead.

## Inputs

Use, in order:
1. Today's `~/.eod/<client>/<today>.notes.md` (raw dump + PR facts). If it doesn't exist, run the gather steps (SKILL.md step 2) first; the arguments after `internal` and the client name are the notes.
2. Today's client EOD `~/.eod/<client>/<today>.md` and its `## Internal notes`, if it exists. If it doesn't, still write the internal one, and skip the "What the client heard" section.
3. Yesterday's internal update, for continuity (risks raised then, asks still unanswered).

## What changes from the client version

- **Technical is fine.** Ticket IDs, PR links, real component names, "staging", "text-to-SQL". Keep it skimmable: one line per item, not the PR body.
- **Candid.** Cut corners, tech-debt tickets created, things that need tuning, flaky bits, cost (internal tooling billed to someone's own keys), and what slipped and why. Every problem comes with what's being done about it; frank, not whiny.
- **Scope and money get named.** Anything that might be outside the agreed scope, any billing-relevant decision Roger made solo (usage limits, a feature of disputed scope), and staffing or end-date timing against remaining work.
- **Still trimmed:** personal health detail stays one line; don't paste a colleague's summary back to them, reference it ("re: your summary from the call").

## Shape

```
Good afternoon team! Internal update for <Client> :slightly_smiling_face: (client version already went out)

SHIPPED
• ACME-140 Accept rounded percentages (<PR url>): growth answers stop cutting off on rounding

IN FLIGHT
• ACME-118/129 (<PR url>): in my final review, merging tomorrow

RISKS AND CORNERS CUT
• Staging deploys silently failed for two days; fix merged, redeploy not verified yet
• ...

WHAT THE CLIENT HEARD
• Told them QA is still in progress; it's actually done, holding it until the video is ready

NEEDS A DECISION @<internal_lead>
• ACME-67 admin dashboard: the client flagged it as possibly out of scope, and it's now merged. Do we bill it or treat it as included?

<closing in Roger's voice>
```

- Drop any section with nothing in it. A quiet day can be SHIPPED plus one line.
- Bullets use `•`, headers ALL CAPS without emojis. Emojis are Slack shortcodes (`:slightly_smiling_face:`, `:sweat_smile:`), one or two in the whole message.
- PR references: `TICKET-ID short title (url)`. One line each.
- Tag `@<internal_lead>` only when there's a real ask or decision, and put the tag on the line with the ask.
- "What the client heard" lists every place the client EOD softened, delayed, or left out something the lead should know. This is the section the lead can't get anywhere else, so be precise.

## Cleanup and delivery

1. Apply `de-ai-writing` and `avoid-ai-tropes` if installed (Roger wants every update through them, internal included), else the hard rules in `plain-language.md`.
2. Save to `~/.eod/<client>/<today>-internal.md` and run:
   `python3 <skill-dir>/scripts/check_eod.py ~/.eod/<client>/<today>-internal.md --mode internal --client ~/.eod/<client>/client.md`
   Internal mode allows ticket IDs, links, identifiers, and jargon, but still blocks dashes and AI tropes.
3. If the optional formatter is available, generate a clipboard preview using `references/formatting.md` with mode `internal`. Deliver as plain text, not in a code block, then "Before you send:" and the preview URL if generated (SKILL.md step 7). Without the formatter, normal delivery still completes. Typical internal flags: an unverified "fixed" claim, or a decision that should be a DM rather than a channel post.
