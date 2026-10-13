---
name: avoid-ai-tropes
description: "Write, proofread and deep-rewrite prose without AI writing tropes: negative parallelism, em dashes, fake suspense, bold-label bullets, inflated vocabulary, flat rhythm. Use whenever the user asks to write, draft, edit, review or proofread prose in any format (docs, READMEs, pull request descriptions, commit messages, chat messages, emails, posts, reports); when they ask whether text sounds like AI; and when they ask to de-AI, humanize or clean up text."
license: MIT
metadata:
  rogs-skills/contract: "1"
  opencode/slash: "true"
---

# Avoid AI writing tropes

Prose that reads like a competent person wrote it: varied, specific, shaped by its content and its author. Any single pattern used once can be fine; the tell is density, several tropes together or one trope repeated.

Pick the mode from the request:

- Writing: the user wants new prose. Apply the rules from the first sentence, then check the draft before replying.
- Proofreading: the user wants existing text checked ("does this sound like AI?", "proofread this"). Report findings; change the text only when asked.
- Deep rewrite: the user wants existing text cleaned up ("de-AI this", "make it sound human", "remove the AI-isms"), including prose you just generated.

The full catalog with examples is [references/patterns.md](references/patterns.md). Read it before proofreading, before a deep rewrite, and before writing anything longer than about 300 words. For a short message or a commit message, the rules in this file are enough.

## Rule zero: the meaning stays

This skill edits tone, voice and rhythm. The thesis, the argument and the facts survive every pass, and every other rule here gives way to this one.

- Claims, facts, numbers, names, dates, commitments and the logic of the argument keep their substance.
- Hedges that carry meaning stay: "we may" is not "we will", "most" is not "all". Strip hedge filler ("it's worth noting"); keep hedge content.
- Quoted material stays word for word, tells included.
- Add no facts, numbers, anecdotes or opinions the author did not express. When a vague claim needs a specific you do not have, keep it modest and plain or leave a [placeholder] for the user.
- When a sentence cannot lose its tell without changing what it asserts, keep the assertion and leave the sentence mostly alone, or point out the tension to the user.

## Voice, medium, audience

- Keep the author's voice. When the text has one (register, humor, recurring vocabulary, formality, quirks), the result reads like the same person on a good day. Keep their contractions, sentence habits and word choices wherever those are not tells.
- Follow the medium's conventions when you know the medium. A social post, a cold email, a README, deck copy and a blog post differ in length, formatting, greeting and directness; the result still looks native to where it will live.
- Write for the known audience. Technical readers tolerate density, executives want the point early, and strangers need more context than teammates.
- Ask when a real decision is open. If the tone or voice is ambiguous and the choice changes the result (no voice to preserve, mixed registers, unknown medium or audience), ask one short question with a couple of options before rewriting. When the text, the medium or the conversation answers it, decide and go.

## Hard rules

The most recognized tells. They bind every word you write while this skill is active: the deliverable, any "Changed:" summary, and your own chat prose around it. The classic regression is adding a tell while removing others, such as an em dash appearing in the cleaned-up version. Your habits return while your attention is on someone else's text, which is why the final check exists.

1. No em dashes in any form: the em dash (U+2014), a spaced en dash (U+2013), or a double hyphen. Use a comma, colon, period or parentheses, or restructure, and vary the replacement.
2. No negative parallelism: "It's not just X, it's Y", "This isn't about X. It's about Y.", "not because X, but because Y", or the cross-sentence reframe. State the point once, directly.
3. No fake suspense: "Here's the kicker", "Here's the thing", a question answered at once ("The result? Devastating."), or a countdown ("Not X. Not Y. Just Z.").
4. No signposted conclusions: "In conclusion", "To sum up", "Ultimately," as an opener. End on a concrete point.
5. No bold-first bullets (a bold label and a colon opening a bullet), and no paragraph opening with a bolded claim, which is the same tell in prose.
6. No stock AI phrases: "I hope this email finds you well", "stands as a testament", "plays a vital role", "in today's fast-paced world", "let's dive in", "delve", "look no further".

## Checklist

The rest of the catalog in short form, for writing mode and for quick passes.

Words:
- Plain verbs beat inflated ones: use, help, show, build, in place of leverage, utilize, harness, streamline.
- Plain nouns beat ornate ones: tapestry, landscape, paradigm, synergy and ecosystem are almost always decoration.
- Gravitas adverbs (quietly, deeply, fundamentally, remarkably, arguably) add weight the sentence has not earned; cut them.
- "Is" and "are" in place of "serves as", "stands as", "marks" and "represents".

Sentences:
- One triad per piece at most, and never two in a row.
- Vary how sentences open; three in a row with the same opener is a pattern.
- Cut filler transitions such as "Importantly", "Notably" and "Interestingly".
- Cut trailing participle clauses that assign meaning ("...highlighting its importance", "...reflecting broader trends").
- Use "from X to Y" only for a real spectrum with a middle.

Paragraphs and tone:
- Let content carry emphasis; a standalone one-line fragment only manufactures it.
- Write prose as prose; "The first problem is... The second problem is..." is a list in disguise.
- Deliver strong points plainly, without "Here's where things get interesting" buildups.
- Explain without "Think of it as..." analogies or "Imagine a world where..." futurism.
- Skip performed candor ("And yes, I'll be honest...") and fourth-wall winks.
- Show that something is clear or simple instead of asserting it.
- Size claims to the subject; a new feature does not define an era.
- Address capable readers as peers, without "Let's break this down".
- Name the source of a claim, or drop the claim; "experts argue" names no one.
- Make the argument instead of coining a label for it ("the supervision paradox").

Formatting:
- Characters a keyboard types: straight quotes, no arrows (U+2192), no decorative Unicode.
- Bold almost nothing.

Composition:
- Say each point once: no intro preview plus section summaries plus a restating conclusion.
- One metaphor, used once.
- One historical comparison at most, and only when it truly maps.
- Length follows content. An argument that needs 800 words gets 800 words, not one point restated many ways.
- End without "Despite these challenges, [optimism]".

## Writing mode

Before drafting, know the reader, the medium, the one thing the reader should take away, and which specifics (facts, numbers, names) you actually have. Ask about tone only when it is a real open question. Open with substance, vary the rhythm, use contractions where the register allows, and stop when the content ends. Then run the final check below and deliver just the text, with no summary and no mention of this skill.

## Proofreading mode

Read the catalog, then scan the text. Report each hit by pattern name with the offending quote and a proposed fix:

```
1. Negative parallelism: "This isn't a rewrite, it's a reckoning."
   Fix: "We are rewriting most of it." or cut the sentence.
2. Bold-first bullets: all six bullets under Features.
   Fix: full-sentence bullets, or two sentences of prose.
```

When the user wants the fixes applied, follow the deep rewrite workflow. When the text is clean, say so in one line; never invent findings to look thorough.

## Deep rewrite mode

1. Check permission before touching files. When the user pointed at a file and asked for the cleanup, editing it is the job. When permission is missing or unclear, ask, or deliver the rewrite in chat for them to apply.
2. Read the catalog, then read the whole text once for meaning: note the claims, facts, voice markers, medium and audience. They define what must survive and what the result should sound like.
3. Ask about tone or voice now if it is open. One question up front beats a rewrite in the wrong direction.
4. Edit in passes, structure first: structure (padding, fractal summaries, formatting inflation), then sentences (the hard-rule constructions), then words (inflated vocabulary, hedge filler), then rhythm (vary sentence length and shape). Fixing words first wastes effort on sentences that should not survive.
5. Edit only what needs it. There is no quota: padded text may lose a lot, tight text may need two small fixes, and clean text needs none.
6. Run the final check, then deliver the rewritten text (or the edited file), followed by a short "Changed:" summary grouped by pattern, listing only what you did:

   ```
   Changed:
   - Replaced the em dashes with commas, colons and sentence breaks
   - Rewrote two "it's not just X, it's Y" constructions
   - Turned the bold-label bullets into plain prose
   - Swapped inflated words (seamless, robust, leverage) for plain ones
   ```

   When nothing needed fixing, the whole reply is one line saying the text is already clean, plus anything borderline you left alone and why. Show a line-by-line diff only when asked.

## Final check

Run all three before delivering, in every mode that produces text:

1. Check the deliverable. With a shell, save the text to a file and run the bundled checker, where `<skill-dir>` is the directory containing this file; fix the true positives and rerun until clean:

   ```bash
   python3 <skill-dir>/scripts/check.py <file>
   printf '%s\n' "$text" | python3 <skill-dir>/scripts/check.py -
   ```

   Without a shell, scan against the hard rules, and against the full catalog for anything longer than a paragraph or two. The checker is informational: you judge its false positives, such as a quoted tell inside a "Changed:" summary or inside someone's quotation.
2. Scan your whole reply, summary and surrounding prose included, for tells you may have typed yourself: an em dash, a spaced en dash, a double hyphen, a "not X, it's Y", a suspense opener, a bold-label bullet. Check the dashes character by character, not from memory.
3. Confirm rule zero: every fact, number, claim and meaningful hedge from the original is intact, and nothing was invented.

The cure for AI prose is not a new uniform of choppy minimalism. When every sentence comes out short and stark, that is a costume too.

## Further reading

The public catalog at https://tropes.fyi collects many of the same patterns with examples.
