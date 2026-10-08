# AI Writing Pattern Catalog

The full reference behind the hard rules in SKILL.md. Read this before a rewrite pass or substantial fresh writing.

Contents: Why AI writing sounds like AI / A. Performed depth / B. Uniformity / C. Risk-averse vagueness / D. Over-formatting / E. Word and phrase flags / Overcorrection.

## Why AI writing sounds like AI

LLM output has statistical fingerprints, and readers have learned them. One recognized tell can taint an entire piece: the reader stops trusting that a person meant what was said. Nearly every tell traces back to four root habits:

1. **Performing depth instead of providing it.** Rhetorical drama that gestures at insight without adding information: fake reveals, false contrasts, inflated stakes.
2. **Uniformity.** Same sentence rhythm, same paragraph shape, triads everywhere, every section built on the same template. Human writing is uneven.
3. **Risk-averse vagueness.** Safe abstract words, hedges, unnamed authorities, balanced non-positions, generalities where a specific would do.
4. **Over-formatting.** Bullets, bold labels, headers, and emoji doing work that sentences should do.

Internalize these four and you will catch patterns this file never lists. Everything below is a manifestation of one of them.

A note on density: almost any pattern here, used once, can be fine in human writing. The fingerprint is clustering: multiple tropes together, or one trope repeatedly. Judge accordingly, and remember the same standard applies to your own output while you edit (see the hard rules in SKILL.md).

## A. Performed depth

- **Negative parallelism** (hard rule 2). All shapes: "It's not just X, it's Y." / "This isn't about X. It's about Y." / "Not because X, but because Y." / "The question isn't X. The question is Y." / dramatic "X, not Y." fragments. Nearly always X and Y describe the same thing and the sentence adds nothing. Fix: state the point directly, once.
  - ✗ "This isn't just about speed—it's about fundamentally reshaping collaboration."
  - ✓ "The speed matters, but the bigger change is in how the team works together."
- **Fake suspense** (hard rule 3). "Here's the kicker", "Here's the thing", "But there's a catch", rhetorical Q&A ("The result? Devastating."), dramatic countdowns ("Not a bug. Not a feature. A design flaw."). Fix: if the point is strong, deliver it plainly. If it needed the buildup, it wasn't.
- **Stakes inflation.** Everything is transformative, game-changing, or reshaping the landscape. Fix: state what actually changed, at its real size. "Reviews come back in hours instead of days" beats "fundamentally transforming collaboration".
- **Superficial significance clauses.** A present-participle tail attaching unearned meaning: "...highlighting its importance", "...underscoring the need for change", "...reflecting broader trends", "...paving the way for innovation", "...cementing its status". Fix: delete the clause. If the significance is real, give it its own sentence with evidence.
- **"Serves as" dodges.** "Serves as", "stands as", "acts as", "represents", "marks" where "is" belongs. Fix: use "is". Plain copulas are human.
- **The patronizing analogy.** "Think of it as...", "It's like a..." for concepts that needed no metaphor. Fix: cut, unless the concept genuinely requires one; then one metaphor, once.
- **The dead metaphor beaten to death.** One metaphor stretched across a whole piece. Fix: a metaphor may appear once, do its job, and leave.
- **Invented concept labels.** Coining pseudo-analytical terms ("the supervision paradox", "workload creep") and citing them like established ideas. Fix: make the argument instead of naming it.
- **"The truth is simple" moves.** "The reality is...", "The real story is...", "History is clear on this", asserting clarity instead of demonstrating it. Fix: show, don't declare.
- **False vulnerability.** Performative honesty or self-awareness: "And yes, since we're being honest...", "This is not a rant; it's a diagnosis." Polished, risk-free confession that simulates authenticity. Real vulnerability is specific and uncomfortable. Fix: cut the performance; never manufacture admissions the author didn't make (rule zero).
- **"Imagine a world where..."** The invitation to futurism: "Imagine" followed by a list of wonderful things that happen if the reader accepts the premise. Fix: make the argument in the present tense; describe what the thing does, not the utopia it implies.
- **The pedagogical voice.** "Let's break this down", "Let's unpack this", "Let's explore", "Let's dive in": teacher mode for readers who didn't ask for a teacher, even in expert-audience writing. Fix: cut the invitation and present the material.
- **Historical analogy stacking.** Rapid-fire company or tech-revolution lists to borrow authority: "Apple didn't build Uber. Facebook didn't build Spotify. Stripe didn't build Shopify." Especially common in technical writing. Fix: at most one analogy that genuinely maps, or make the argument on its own merits.

## B. Uniformity

- **Tricolon abuse.** "Faster, smarter, and more scalable." One triad per piece is rhetoric; a triad per paragraph is a fingerprint, especially when the third item restates the second more grandly. Fix: keep the one or two items that are true and distinct.
- **Anaphora abuse.** Three or more sentences opening with the same words ("They assume... They assume... They assume..."). Fix: keep at most two, restructure the rest.
- **Drumbeat fragments.** "Short. Punchy. Fragments." and one-line paragraphs for manufactured punch. One fragment can land; a pattern of them is a tell. Fix: natural variation.
- **Flat rhythm.** Sentence after sentence of the same length and shape. Fix: deliberately mix. A 5-word sentence next to a 30-word one that winds through a subordinate clause before landing. Read it aloud in your head; if it sounds metronomic, break it.
- **Listicle in a trench coat.** "The first challenge is... The second challenge is... The third..." Prose wearing a numbered list's skeleton. Fix: an honest list, or actual connected prose.
- **Fractal summaries.** Intro says what you'll say, sections say it, outro says what you said, every paragraph ends with a mini-bow. Fix: say it once. Trust the reader. Paragraphs may end on a fact.
- **Signposted conclusions** (hard rule 4). "In conclusion", "To sum up", "In summary", "Ultimately," as the final-paragraph opener. Fix: end on a concrete point; endings should feel like endings without announcing themselves.
- **Formulaic titles.** "X: Why Y Matters", "X: How Y Changes Z". Fix: titles can just say the thing.
- **"Despite these challenges..."** The acknowledge-then-dismiss formula ending in unearned optimism. Fix: if the problems are real, let them weigh what they weigh.
- **One-point dilution.** A single thesis restated ten ways with different metaphors and framings to feel comprehensive. Fix: keep the version that says it best; length follows content. (When rewriting, this is where real cuts come from; when writing fresh, stop when the argument is made.)
- **Content duplication.** Whole sentences or sections repeated verbatim or near-verbatim in longer pieces. Fix: in anything long, scan for repeats and keep one.

## C. Risk-averse vagueness

- **Hedge filler.** "It's worth noting that", "It's important to note", "Importantly", "Notably", "Interestingly", "Arguably", "generally speaking", "to some extent". Fix: delete the filler. (Meaningful hedges stay; see rule zero.)
- **Vague attribution.** "Experts say", "studies show", "many believe", "industry observers note". Also source-count inflation: "several publications have cited" when it means two, one person's take presented as consensus. Fix: name the source or drop the appeal to authority; keep the underlying observable claim if it stands on its own; count honestly.
- **Generic abstractions.** Claims that could fit any company, product, or topic: "We deliver innovative solutions that drive results." Fix: replace with the specific, if one exists in the source material or conversation. Never invent one (rule zero); otherwise keep the claim modest and plain.
- **Both-sides mush.** Balanced non-positions where the evidence supports a stance. Fix: when the material supports a conclusion, state it plainly.
- **False ranges.** "From startups to enterprises, from strategy to execution" where no real spectrum exists. Fix: name the two things plainly ("startups and enterprises") or cut.
- **"Whether you're X or Y..."** Audience-flattering setup that says nothing. Fix: cut; address the actual reader.

## D. Over-formatting

Formatting norms depend on the medium (a README tolerates more structure than a blog post; deck copy is bullets by nature). Within the medium's norms:

- **Bold-first bullets** (hard rule 5). "**Speed:** builds run 3x faster" bullets, and their prose cousin, paragraphs opening with a bolded claim sentence. The most recognizable AI formatting tell, common in decks and READMEs. Fix: full-sentence bullets, plain prose, or restructure.
- **Bullets doing prose's job.** Three connected thoughts don't need a list; they need two good sentences. Reserve lists for genuinely enumerable things (steps, specs, options).
- **Header inflation.** H2s every two paragraphs in an 800-word piece. Fix: short pieces usually need zero or few headers.
- **Bold sprinkled everywhere.** Bolding key phrases mid-sentence throughout. Fix: bold almost nothing.
- **Emoji decoration.** Emoji in headers, bullets, or section labels. Fix: none, unless the author's own style uses them.
- **Unicode furniture.** Arrows (→), curly "smart" quotes in plain-text contexts, box-drawing flourishes. Fix: type like a person at a keyboard.
- **Title Case Headings Everywhere.** Fix: sentence case reads more human in most contexts.

## E. Word and phrase flags

Flags, not bans. One "crucial" is fine; "crucial" plus "pivotal" plus "vital" on one page is a fingerprint. When a plainer word carries the meaning, use the plainer word. Keep domain terms the audience expects ("robust" in a statistics paper is a technical word, not slop).

- Inflated verbs: delve, leverage, utilize, harness, streamline, foster, empower, unlock, elevate, supercharge, revolutionize, spearhead, showcase, underscore, bolster, navigate (metaphorical), embark
- Inflated adjectives: robust, seamless, cutting-edge, game-changing, transformative, pivotal, crucial, vital, holistic, intricate, vibrant, dynamic, comprehensive, innovative, ever-evolving
- Ornate nouns: tapestry, landscape (abstract), realm, journey (metaphorical), ecosystem (metaphorical), paradigm, synergy, framework (decorative rather than technical), beacon, testament, cornerstone, powerhouse, game-changer
- Magic adverbs: seamlessly, effortlessly, quietly (as gravitas), deeply, fundamentally, remarkably, truly, genuinely, certainly
- Stock connective tissue: "Moreover", "Furthermore", "Additionally" as paragraph openers; "When it comes to"; "At the end of the day"; "That being said"; "In the world of"; "a wide range of"; "It comes as no surprise"
- Stock phrases (hard rule 6): "I hope this email finds you well", "stands as a testament", "plays a vital role", "in today's fast-paced world", "let's dive in", "without further ado", "look no further"
- Fake-suspense variants (hard rule 3): "Here's the kicker/thing/deal", "Here's where it gets interesting", "Here's what most people miss"
- Plain replacements that usually win: use, help, show, make, build, start, big, main; "is" instead of any dodge

## Overcorrection

The fix for AI slop is not a new uniform. Watch for these while editing:

- All-choppy minimalism: every sentence short and stark is a costume, and increasingly a recognized one.
- Forced casualness: slang and lowercase pasted onto formal content reads as fake. Competent formal writing is human too; register belongs to the author and the medium (see SKILL.md, Voice).
- Edits for their own sake: if a passage has no tells, it doesn't need your fingerprints. Leaving text alone is a valid edit.
