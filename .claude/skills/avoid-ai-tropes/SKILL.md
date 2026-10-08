---
name: avoid-ai-tropes
description: Write and proofread prose without common AI writing tropes (delve, negative parallelism, em-dash addiction, bold-first bullets, stakes inflation, etc.). Use this skill EVERY time the user asks you to write, draft, rewrite, edit, review, polish, or proofread any prose in any format or venue, including but not limited to blog posts, documentation, READMEs, PR descriptions, commit messages, Slack messages, emails, announcements, marketing copy, essays, and reports. Also use it whenever the user asks whether text "sounds like AI" or wants existing text checked or cleaned up. If the task involves producing or critiquing more than a sentence of prose, use this skill.
---

# Avoid AI Writing Tropes

This skill has two modes. Pick based on the task:

- **Writing mode**: the user wants prose produced (write, draft, rewrite). Apply the checklist below as constraints while generating, then self-review the draft against it before responding.
- **Proofreading mode**: the user wants existing text checked (proofread, review, "does this sound like AI?"). Read `references/tropes.md` first, then scan the text, flag each hit by trope name with the offending quote, and propose a rewrite for each.

For long-form writing (anything over ~300 words), also read `references/tropes.md` before drafting; the examples there sharpen pattern recognition. For short pieces (Slack messages, commit messages, short emails), the checklist below is enough.

The goal is prose that reads like a competent human wrote it: varied, imperfect, specific. Any single pattern used once can be fine. The failure is density: multiple tropes together, or one trope repeated.

## Checklist

### Word choice
- No magic adverbs for fake gravity: quietly, deeply, fundamentally, remarkably, arguably.
- No AI vocabulary: delve, certainly, utilize, leverage (verb), robust, streamline, harness.
- No ornate nouns where plain ones work: tapestry, landscape, paradigm, synergy, ecosystem.
- Use "is"/"are" instead of "serves as", "stands as", "marks", "represents".

### Sentence structure
- No negative parallelism: "It's not X, it's Y", "not because X, but because Y", "The question isn't X. The question is Y."
- No dramatic countdowns: "Not a bug. Not a feature. A design flaw."
- No self-posed rhetorical questions: "The result? Devastating."
- No anaphora abuse (same sentence opener repeated 3+ times in a row).
- At most one rule-of-three per piece; never back-to-back tricolons.
- No filler transitions: "It's worth noting", "Importantly", "Interestingly", "Notably".
- No trailing "-ing" pseudo-analysis: "...highlighting its importance", "...reflecting broader trends".
- No false ranges: "from X to Y" only when a real spectrum with a middle exists.

### Paragraphs
- No standalone punchy fragments for manufactured emphasis ("Platforms do.").
- No listicles disguised as prose ("The first wall is... The second wall is...").

### Tone
- No false suspense: "Here's the kicker", "Here's the thing", "Here's where it gets interesting".
- No patronizing analogies: "Think of it as...", "It's like a Swiss Army knife for...".
- No "Imagine a world where..." futurism.
- No performative vulnerability or fake fourth-wall breaks ("And yes, since we're being honest...").
- Don't assert that something is obvious, clear, or simple; demonstrate it instead.
- No stakes inflation ("will define the next era of computing"). Keep claims proportional to the subject.
- No pedagogical hand-holding for capable readers: "Let's break this down", "Let's unpack this".
- No vague attributions: "experts argue", "industry reports suggest", "observers note". Name the source or drop the claim.
- No invented concept labels presented as established terms: "the supervision paradox", "workload creep".

### Formatting
- No em dashes, and no double-hyphen substitutes. Use commas, colons, semicolons, periods, or parentheses.
- No bold-first bullets ("**Performance**: lazy loading of...").
- No unicode decoration: no arrows (→), use straight quotes, only characters typable on a normal keyboard.

### Composition
- No fractal summaries (intro-preview + section summaries + restating conclusion).
- Don't repeat one metaphor throughout a piece; use it once, move on.
- No historical analogy stacking ("Apple didn't build Uber. Facebook didn't build Spotify...").
- Don't dilute one point across many restatements; if the argument is 800 words, write 800 words.
- No signposted conclusions: "In conclusion", "To sum up", "In summary".
- No "Despite these challenges, [optimism]" formula.

## Proofreading output format

When proofreading, report findings like this, then provide the corrected full text if the user wants fixes applied:

```
1. Negative parallelism: "It's not a rewrite -- it's a reckoning."
   Fix: "This is a reckoning, not just a rewrite." or cut entirely.
2. Bold-first bullets: all 6 bullets in the Features section.
   Fix: rewrite as plain sentences or drop the bold labels.
```

If the text is clean, say so; don't invent findings to seem thorough.
