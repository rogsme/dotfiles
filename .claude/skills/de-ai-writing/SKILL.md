---
name: de-ai-writing
description: Deep-rewrite procedure and style reference for removing the tells of AI-generated prose (em dashes, "it's not just X, it's Y" constructions, slop vocabulary, bold-label bullets, uniform rhythm). Use when the user explicitly asks to de-AI, humanize, de-slop, or naturalize writing; says text "sounds like AI/ChatGPT/a robot"; asks to remove AI-isms or em dashes; or asks for a tone/style/voice cleanup while reviewing or editing existing prose, including prose Claude just generated ("clean up that doc so it doesn't sound AI"). Also use when the user asks for fresh writing with the explicit requirement that it not sound AI-generated. Do NOT trigger on ordinary writing, drafting, reviewing, or editing requests that don't ask for style, tone, or AI cleanup.
---

# De-AI Writing

Removes the tells of AI-generated prose while leaving everything that matters intact. Two modes:

- **Rewrite mode**: clean up existing text (pasted into chat, in a file, or something you just generated).
- **Fresh-writing mode**: the user asked for new prose with the requirement that it not read as AI.

This file holds the rules of engagement and the workflow. The full pattern catalog with examples lives in `references/patterns.md`. Read it before any rewrite pass and before substantial fresh writing; for a quick touch-up of a sentence or two, the hard rules below are usually enough. Load only what the job needs.

## Rule zero: the meaning is untouchable

This skill edits tone, voice, and vibe. It never edits the thesis, the argument, or the facts. Everything else in this skill is subordinate to this rule.

- Claims, facts, numbers, names, dates, commitments, and the logic of the argument survive with their substance intact.
- Hedges and qualifiers that carry meaning stay: "we may" is not "we will", "most" is not "all". Strip hedge *filler* ("it's worth noting"), never hedge *content*.
- Quoted material is sacrosanct. Never alter words inside quotation marks, even when they contain tells.
- Never invent facts, numbers, anecdotes, or opinions the author didn't express. If a vague claim would improve with a specific you don't have, keep it modest and plain or leave a [placeholder] for the user.
- If a sentence can't be de-AI'd without changing what it asserts, keep the assertion and leave the sentence largely alone, or flag the tension to the user.

## Voice, medium, audience

- **Follow the author's voice.** When the text has a voice (register, humor, recurring vocabulary, formality, quirks), the rewrite should read like the same person on a good day, not like a different writer. Keep their contractions habits, their sentence habits, their word choices where those aren't tells.
- **Follow the conventions of the medium, when known.** A LinkedIn post, a cold email, a README, deck copy, and a blog post each have different norms for length, formatting, greeting, and directness. De-AI'd writing should still look native to where it will live.
- **Write for the known audience.** Technical readers tolerate density; executives want the point early; strangers need more context than teammates.
- **Ask when a real decision is needed.** If the target tone or voice is genuinely ambiguous and the choice materially changes the result (no existing voice to preserve, mixed registers in the draft, unknown medium or audience), ask the user what tone or voice they want before rewriting. One quick question with a couple of options, not a questionnaire. Don't ask when the answer is inferable from the text, the medium, or the conversation.

## Hard rules

The most recognized tells. Details and examples for all of these are in `references/patterns.md`.

These rules bind every word you write while this skill is active: the rewritten text, the "Changed:" summary, and your own chat prose around it. The classic regression is introducing a tell while removing others, an em dash or a "not X, but Y" appearing in the supposedly de-AI'd version. Your default writing habits will reassert themselves while your attention is on someone else's text; the final scan in Verification exists for exactly this reason. Never trade one tell for another.

1. **No em dashes**, in any disguise (—, spaced –, or "--"). Replace with a comma, colon, period, parentheses, or restructure; vary the replacement.
2. **No negative parallelism**: "It's not just X, it's Y", "This isn't about X. It's about Y.", "not because X, but because Y", the cross-sentence reframe. State the point once, directly.
3. **No fake suspense**: "Here's the kicker/thing", rhetorical questions answered immediately ("The result? Devastating."), dramatic countdowns ("Not X. Not Y. Just Z.").
4. **No signposted conclusions**: "In conclusion", "To sum up", "Ultimately," openers. End on a concrete point, not a zoomed-out bow.
5. **No bold-first bullets** (bolded label + colon), and no bold-label lead-in paragraphs, the same tell in prose form.
6. **No stock AI phrases**: "I hope this email finds you well", "stands as a testament", "plays a vital role", "in today's fast-paced world", "let's dive in", "delve", "look no further".

## Rewrite workflow

1. **Check permissions before touching files.** Normal file-editing rules apply. If the user pointed at a file and asked for the cleanup, editing it is the job. If permission to modify wasn't given or is unclear, ask first or deliver the rewrite in chat and let them apply it.
2. **Read `references/patterns.md`**, then read the full text once for meaning: note the claims, facts, voice markers, medium, and audience. These define what must survive (rule zero) and what the result should sound like.
3. **Ask about tone/voice now if needed** (see Voice section). Better one question up front than a rewrite in the wrong direction.
4. **Edit in passes, structure first**: structure (padding, fractal summaries, formatting inflation), then sentences (hard-rule constructions), then words (slop vocabulary, hedge filler), then rhythm (vary sentence length and shape; read it aloud in your head). Order matters: fixing words first wastes effort on sentences that shouldn't survive.
5. **Edit only what needs editing.** There is no quota of changes and no target amount to cut. Padded text may lose a lot; tight text may need two small fixes; clean text needs none. "No relevant edits" is a perfectly good outcome. Report it honestly rather than inventing changes.
6. **Verify** (see Verification), then deliver per the output contract.

## Fresh-writing workflow

Apply the rules from the first sentence rather than drafting slop and cleaning it. Before drafting: know the reader, the medium, the one thing the reader should take away, and which specifics (facts, numbers, names) are actually available. Ask about tone/voice if it's a real open question. For anything longer than a couple of paragraphs, read `references/patterns.md` first. Open with substance, vary rhythm, use contractions where the register allows, end when the content ends.

## Output contract

**Rewrite mode:** return the rewritten text (or edit the file, per permissions), then a short "Changed:" summary grouped by pattern type. Report only what you actually did. Example shape:

```
Changed:
- Replaced the em dashes (commas, colons, sentence breaks)
- Rewrote two "it's not just X, it's Y" constructions
- Converted the bold-label bullets to plain prose
- Swapped slop vocabulary (seamless, robust, leverage) for plain words
```

If nothing needed fixing, the whole response is one line saying the text is already clean, plus anything borderline you left alone and why. No line-by-line diff unless asked.

**Fresh-writing mode:** just the deliverable. No summary, no mention of this skill.

## Verification

Three checks before delivering, every time:

1. **Check the deliverable.** With shell access, run the bundled checker and fix true positives, rerunning until clean. Without shell access, scan manually against the hard rules, and against the full catalog for anything longer than a paragraph or two.

```bash
python <skill-path>/scripts/check.py <file>     # or: echo "text" | python check.py -
```

2. **Scan your entire composed response**, summary and surrounding prose included, specifically for tells you may have just typed yourself: any em or en dash, " -- ", a "not X, it's Y" construction, a fake-suspense opener, a bold-label bullet. This step catches the most common real-world failure (an em dash in the de-AI'd version). Do it literally, character by character for the dashes, not from memory of what you meant to write.

3. **Confirm rule zero**: every fact, number, claim, and meaningful hedge from the original is intact, and nothing was invented.

The checker is informational: you judge false positives (quoted tells inside your "Changed:" summary or inside someone's quotation are fine).

One caution: the fix for AI slop is not a new uniform of choppy minimalism. If every sentence comes out short and stark, that's a costume too. The goal is prose shaped by its content and its author.
