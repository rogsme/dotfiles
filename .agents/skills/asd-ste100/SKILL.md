---
name: asd-ste100
description: "Write or rewrite technical documentation in ASD-STE100 Simplified Technical English (Issue 9), and check text against it. Use when the user asks for STE, Simplified Technical English, ASD-STE100 or controlled English, or asks to convert, rewrite or check procedures, instructions, descriptions, warnings, cautions or release notes against the standard."
license: MIT
metadata:
  rogs-skills/contract: "1"
  opencode/slash: "true"
---

# ASD-STE100 Simplified Technical English (Issue 9, 2025)

Rewrite the target text so that it complies with ASD-STE100. STE is a controlled natural
language for technical documentation. It has two parts: writing rules (grammar and style)
and a controlled dictionary (approved words, each with one approved part of speech and one
approved meaning, based on American English). This skill distills the Issue 9 rules into an
operating procedure. When a word-approval decision is not covered below and accuracy is
critical, consult the published standard (the authoritative source; see "Source" at the end).
ASD gives out the standard free of charge, with its full dictionary:
https://www.asd-europe.org/standards-specifications/simplified-technical-english/download-asd-ste-100

If the user asks only for "simpler" or "clearer" text without naming STE, ask whether they
want full STE compliance before applying these rules.

## 1. Classify the text first

STE limits differ by text type. Identify each block before rewriting:

| Text type      | Signs                                            | Sentence limit | Verb form             |
| -------------- | ------------------------------------------------ | -------------- | --------------------- |
| Procedural     | Work steps, instructions, how to do a task      | 20 words max   | Imperative (command)  |
| Descriptive    | How a system works, general information, reports | 25 words max   | No imperative allowed |
| Safety         | WARNING / CAUTION blocks                         | 20 words max   | Command or condition  |
| Note           | "NOTE:" inside a procedure                       | 25 words max   | No imperative allowed |

Warnings, cautions, and notes have their own structures (sections 8 and 10 below).

## 2. Hard limits (quick reference)

- Procedural sentence: 20 words max. Descriptive sentence: 25 words max.
- Sentence in a note: 25 words max.
- Multi-word noun: 3 words max (hyphenated groups count as one word).
- Paragraph: 6 sentences max, one topic only.
- No semicolons. No contractions. No omitted words (subject, verb, article).
- Vertical list: colon after the lead-in; each item starts with an uppercase letter; no
  comma or semicolon at the end of items; period only on full sentences and on the last item.

## 3. Word selection

You may use only:

1. Approved dictionary words, each only as its approved part of speech and only with its
   approved meaning. If "test" is approved as a noun only, write "Do a test for leaks", not
   "Test for leaks".
2. Technical nouns: noun terms for a subject-field concept (part names, system names,
   materials, software UI terms, etc.).
3. Technical verbs: verb terms for a subject-field process.

### Technical nouns (permitted categories)

A noun term is usable if it fits a category: official parts information; vehicles/machines and
locations on them; tools and support equipment; materials, consumables, unwanted material;
facilities, infrastructure, logistic procedures; systems, components, circuits, configurations;
mathematical/scientific/engineering terms and formulas; navigation and geographic terms;
numbers, units of measurement, and time; quoted text (placards, labels, screen text);
professional roles, individuals, groups, organizations; parts of the body; personal effects,
food, beverages; medical terms; documents and parts of documentation (chapters, figures,
warnings); environmental and operational conditions; colors (used as adjectives but no
comparative/superlative forms); damage terms (crack, corrosion, dent, fracture...); computer
science and ICT terms (database, file, menu, cursor, firewall, backup, touchscreen, laptop,
large language model, prompt engineering, update...); civil and military operations; law and
regulations; animals, plants, and other life forms.

Rules for technical nouns:

- Use them only as nouns or as adjectives inside a longer technical noun, never as verbs.
  ("Oil the surfaces" becomes "Apply oil to the surfaces.")
- Use the technical noun approved in the company/industry/subject field, and use THE SAME one
  every time for the same item. Never call one item "servo control unit", then "actuator",
  then "control unit".
- Select short technical nouns (3 words max). "Remove the four screws (10) that attach the
  flange (15) to the cover (20)", not "Remove the four stainless steel pan head machine
  screws...".
- No regional, slang, or jargon words. "Do not brick the router" becomes "Do not set the router to
  OFF". "Remove your gear" becomes "Remove your tools and equipment".
- A word that is NOT approved in the dictionary may still be used when it is a technical noun
  or part of one: "Do the backup of the computer", "Retract the main landing gear" ("main" is
  fine inside the technical noun "main landing gear").

### Technical verbs (permitted categories)

Manufacturing processes (drill, ream, weld, solder, braze, cast, plate, polish...); computer
processes and applications (click, tap, type, press, enter, print, copy, paste, delete, save,
scroll, download, upload, install, load, update, reboot, format, debug, encrypt, filter,
zoom in...); subject-field processes (engineering/scientific, medical, civil and military,
navigation, automotive, energy); law and regulation verbs (comply with, enforce, supersede,
waive...) for legal texts only.

Rules for technical verbs:

- If an approved dictionary verb can say it accurately, use the approved verb instead:
  "If you find broken wires, repair them" (person) vs "The scanner detects metal objects"
  (device process).
- Use technical verbs only in their correct context. "Enter your password" (computer input)
  but "Do not go into the engine test area" (physical movement).
- Never use technical verbs as nouns: "Ream the hole to a 0.20-inch dimension", not "Give the
  hole 0.20-inch ream". Past participle as adjective is fine: "Lubricate the reamed hole."

### If a word is not approved: replacement procedure

1. Replace word-for-word with an approved alternative of the same part of speech.
2. If that changes the meaning or produces bad English, use a different sentence
   construction with approved words.
3. Never accept a replacement that changes the technical meaning.

## 4. Common vocabulary swaps

Model output overuses words the dictionary does not approve. These examples show the kind of
swap to make; the official dictionary lists every non-approved word with its approved
alternatives, so look up any word you are unsure of:

| Not approved        | Use instead                        |
| ------------------- | ---------------------------------- |
| ensure (v)          | MAKE SURE                          |
| utilize (v)         | USE                                |
| perform (v)         | DO                                 |
| provide (v)         | GIVE                               |
| allow (v)           | LET                                |
| prior to (prep)     | BEFORE                             |
| require (v)         | NECESSARY (adj)                    |
| test (v)            | TEST (n): "Do a test of ..."       |

Also: no Latin abbreviations ("e.g.", "i.e.", "etc."): write "for example", "that is",
"and other ...". No "could" for possibility. No "utilize", "leverage", "prioritize",
"facilitate" style business verbs: use DO, USE, START, HELP. Write "to", not "in order to".

## 5. Approved verbs

When describing an action, pick an approved verb (or a permitted technical verb). The
dictionary approves a closed list of verbs, for example ADJUST, APPLY, ATTACH, CONNECT, DO,
EXAMINE, INSTALL, MAKE SURE, MEASURE, PUSH, SET, START, STOP, TURN and USE. Check any other
verb against the official dictionary before you use it.

Watch the restricted meanings: WEAR (v) means only "to become damaged by friction"; for
clothing and equipment use PUT ON or USE ("Wear protective clothing" is a violation).
FOLLOW (v) means only "come after, go after"; for instructions use OBEY.

Prefer a direct verb over a noun construction: "The ohmmeter shows 450 ohms", not "gives an
indication of 450 ohms". "Before you remove the unit...", not "Before the removal of the
unit...".

## 6. Verb forms, tenses, and voice

### Allowed verb forms only

| Form                                | Example                    |
| ----------------------------------- | -------------------------- |
| Infinitive / imperative             | (To) adjust / Adjust the X |
| Simple present                      | You adjust / It adjusts    |
| Simple past                         | You adjusted / It adjusted |
| Simple future (WILL)                | You will adjust            |
| Past participle as an ADJECTIVE     | The adjusted linkage       |

Forbidden: present perfect ("has adjusted"), past perfect ("had adjusted"), progressive
("is/was adjusting"), conditional ("could/would adjust"), and all complex auxiliary
constructions ("is to be installed", "can be adjusted", "must be adjusted"; rewrite as
"Install the X" / "You can adjust the X" / "Adjust the X").

### "-ing" forms

Use an "-ing" word only as a technical noun or as a modifier inside a technical noun:
"Cleaning", "Troubleshooting" (headings); "air-conditioning system", "grinding wheel",
"degreasing agent". Never as a progressive verb or a free-floating participle:
"When you do this procedure, obey all the safety precautions", not "When doing this
procedure...". The dictionary approves only a few other "-ing" words; check any other one
against the official dictionary.

### Active voice

Use the active voice. In descriptive writing, passive is permitted only when the agent is
unknown. To convert passive to active:

1. Agent given after "by": make it the subject. "The circuits are connected by a switching
   relay" becomes "A switching relay connects the circuits".
2. Rewrite around the real action verb: "These values are used by the computer to calculate
   energy consumption" becomes "The computer calculates the energy consumption from these values".
3. In procedures, use the imperative: "The test can be continued" becomes "Continue the test".
4. Agent unknown: use "you" (reader) or "we" (organization) as subject: "Additives are not
   used in this fuel" becomes "We do not use additives in this type of fuel" or "This type of fuel
   does not contain additives".

A past participle after "to be/become/stay" that describes a CONDITION is not passive and is
correct: "When the unit is fully disassembled, clean all the parts."

### No phrasal verbs

Do not combine approved words into a new phrase verb: "put out the fire" becomes "extinguish the
fire"; "give off fumes" becomes "release fumes". Only "put on" and "come on" are approved (with
restricted meanings).

## 7. Sentence construction

- One topic per sentence (descriptive). One instruction per sentence (procedural), unless
  two actions occur at the same time: "Hold the panel in its open position and install the
  fastener." "Remove and discard the seal."
- Write all words in full. No contractions ("don't" becomes "do not"). No telegraphic style:
  "Rotary switch to INPUT" becomes "Set the rotary switch to INPUT". "If installed, remove the
  shims" becomes "If shims are installed, remove them."
- Keep articles (the, a, an) and demonstrative adjectives (this, these): "Turn the shaft
  assembly", not "Turn shaft assembly". Exception: no article before an alphanumeric
  identifier ("Tag circuit breaker 36L7") and none in general statements ("Solvents can
  cause damage to paint").
- Split long content into vertical lists (rules in section 2). Put "DO NOT" inside each item
  of a safety list, not once before the list.
- Use approved connecting words/phrases for flow: and, but, then, thus, as a result, at the
  same time.
- Condition-first in instructions, then a comma, then the command: "When the light comes on,
  set the switch to NORMAL." (Not "Set the switch to NORMAL when the light comes on.")
- Keep the conjunction "that" after verbs such as MAKE SURE, SHOW, RECOMMEND: "Make sure
  that the valve is open."
- Replace an ambiguous pronoun with the noun it refers to. If "this" could point at two
  things, restate the referent. No gendered pronouns ("he", "she"); no "man"/"woman" outside
  medical contexts.
- Use "with" carefully: it can mean possession, accompaniment, or instrument. If ambiguous,
  restructure. Lead with the primary action verb: "Seal the opening with tool TS9867", not
  "Use tool TS9867 to seal the opening".
- No semicolons: write two sentences.

## 8. Procedural writing

- Every work step is an imperative sentence of 20 words max: "Set the switch to ON.",
  "Increase the pressure to 60 psi."
- Number or letter the steps; one instruction per step unless actions are simultaneous or a
  result immediately follows the action ("Measure the leakage from the outlet port. The
  leakage must not be more than 0.5 cc/minute.").
- No "must" before an imperative except in safety instructions or for an important condition:
  "Before you remove the clamp, disconnect the hose." (Not "...you must disconnect".)
- Put limits and tolerances directly after the related action in the same step, never in a note.

### Notes

A note gives INFORMATION only (never instructions, requirements, or limits) and never uses
the imperative. Max 25 words per sentence. If the information prevents damage or injury, it
is not a note: write a WARNING or CAUTION instead. Test: the reader must be able to do the
procedure correctly with all notes removed.

## 9. Descriptive writing

- Give information gradually; start with a topic sentence; each paragraph has ONE topic and
  at most six sentences.
- Repeat key words and key phrases consistently to connect sentences ("This system shows the
  pilot... The localizer course aligns with..."). Varying terminology for variety
  breaks the rule.
- Max 25 words per sentence. No imperative form.

## 10. Safety instructions

Structure: signal word, then a command or condition, then an explanation of the risk or
possible result.

- WARNING = risk of injury or death. CAUTION = risk of damage to objects (machines, tools,
  equipment). If both risks exist, use WARNING.
- Start with the direct command or the condition the reader must know first:
  "WARNING: BEFORE YOU FILL THE LIQUID OXYGEN SYSTEM, PUT ON A FACE MASK AND PROTECTIVE
  CLOTHING."
- End with the specific risk, not an abstract statement:
  "...LIQUID OXYGEN CAN CAUSE IRRITATION OF THE RESPIRATORY TRACT AND EYE IRRITATION."
- Write safety instructions in uppercase by convention (formatting is set by the applicable
  style guide; uppercase is the common practice shown in the standard).
- Obey the 20-word sentence limit inside warnings and cautions; use a vertical list with
  "DO NOT" in each item where applicable.

## 11. Punctuation and word count

- All standard English punctuation is allowed EXCEPT the semicolon.
- Hyphens: connect words that operate as one unit ("cutoff-switch power connection",
  "soap-and-water solution", "L-shaped bracket", "O-ring", "heat-treat"). A hyphenated group
  counts as one word. Do not hyphenate groups of more than three words.
- Parentheses are for: references ("(refer to paragraphs 2 thru 5)"), item identifiers
  ("Remove the nuts (74)"), work step numbers, abbreviations ("Liquid Crystal Display
  (LCD)"), singular/plural ("the test(s)"), explanations ("(not more than 10 psi each
  minute)"), and alternatives ("the left (right) access panel").
- Word counting (for the 20/25 limits): count each of these as ONE word: a number; a number
  with its unit ("10 V", "20 kg"); an abbreviation ("NASA", "VPN"); an alphanumeric
  identifier ("36L7", "No. 1"); quoted text ("Service Overview"); titles, headings, placard
  and label text; proper nouns of people, groups, organizations, countries; the contents of
  a parenthetical ("(the ON legend is off)" = 1 word, but that parenthetical text is itself
  a separate sentence with its own count); hyphenated groups. A colon that introduces a
  vertical list ends the sentence (20/25-word limit applies to the lead-in).

## 12. Consistent style

- Same item, same technical noun every time. Same type of work step, same wording every
  time. If you write "Apply a small quantity of oil to the threads of the two bolts" once,
  do not write "Lubricate the two bolts with oil" later for the same operation.
- American English spelling ("fiber", "color", "analog") unless directives say otherwise.
  Do not change spelling inside quoted text.
- Use the possessive ("the manufacturer's instructions") sparingly; restructure if unsure.
- Do not use different words for the same concept in different sections.

## 13. Rewriting workflow

1. Classify each block: procedural, descriptive, safety, note.
2. Fix vocabulary: replace non-approved words (section 4); pick approved verbs; identify and
   freeze the technical nouns (consistent naming).
3. Fix verbs: allowed forms only; kill progressive/perfect/conditional constructions;
   convert passive to active; replace phrasal verbs; replace noun-of-action with a direct
   verb.
4. Fix structure: split long sentences (respect the 20/25 limits with the word-count rules);
   condition-first with comma; vertical lists for series; remove contractions and omissions;
   restore articles; remove semicolons and Latin abbreviations.
5. Fix safety content: correct signal word, command/condition first, risk explanation last.
6. Final pass: consistent terminology, no ambiguous pronouns, "that" after make sure/show/
   recommend, American spelling.
7. Verify with the checklist below. When the user asked for a check rather than a rewrite,
   report violations by rule number (Issue 9 numbering: 1.1-1.14 words, 2.1-2.2 multi-word
   nouns, 3.1-3.7 verbs, 4.1-4.5 sentences, 5.1-5.5 procedural, 6.1-6.6 descriptive,
   7.1-7.3 safety, 8.1-8.7 punctuation/word count, 9.1-9.4 writing practices, GR-1..GR-8
   general recommendations).

## 14. Verification checklist

- [ ] Every sentence within its word limit (20 procedural / 25 descriptive / 25 note), using
      the one-word counting rules.
- [ ] Only approved words (correct part of speech and meaning), technical nouns, or
      technical verbs.
- [ ] Only allowed verb forms; past participle only as an adjective.
- [ ] Active voice (or passive in descriptive text only, with unknown agent).
- [ ] No "-ing" except technical nouns/modifiers and the few the dictionary approves.
- [ ] No contractions, no omitted words, no semicolons, no phrasal verbs, no Latin
      abbreviations.
- [ ] Multi-word nouns max 3 words; hyphens only for true units.
- [ ] One instruction per procedural sentence; imperative form; condition first.
- [ ] Notes contain information only; safety content is in WARNING/CAUTION with risk
      explanation.
- [ ] Paragraphs: one topic, max 6 sentences, topic sentence first.
- [ ] Consistent terminology throughout; American spelling.

## Example (fresh, software domain)

Before (non-STE):

> In order to ensure that the deployment is functioning properly, you should utilize the
> health-check endpoint; however, if it's failing, the service must be restarted by an
> administrator, and additionally the logs should be examined prior to attempting a retry.

After (STE):

> To make sure that the deployment operates correctly, do a check of the health-check
> endpoint. If the endpoint does not operate correctly, an administrator must restart the
> service. Then, examine the logs before you try the deployment again.

Word counts: 15, 13, 10. Active voice, approved verbs (make sure, do, operate, restart,
examine, try), no contractions, no semicolon, condition-first in the conditional sentence.
"Health-check" is hyphenated and counts as one word.

## Source

Distilled from ASD-STE100 Simplified Technical English, Issue 9 (2025-01-15), published by
the Aerospace, Security and Defence Industries Association of Europe (ASD), which owns its
copyright. The vocabulary and verb examples above are a small sample. The authoritative
reference for word approval is the dictionary in the published standard (875 approved
words and 1274 non-approved words with alternatives). For certification-grade compliance,
verify against the standard itself.
