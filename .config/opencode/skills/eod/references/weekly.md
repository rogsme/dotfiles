# Weekly mode

Inputs: this week's daily logs `~/.eod/<client>/YYYY-MM-DD.md` (Monday to today, ignoring `-internal`, `-test`, `-weekly` and `.notes` files) plus their internal notes. Skip if the client has `weekly: false` unless Roger insists. If days are missing, say which ones and ask whether to continue or fill them in first. Save as `~/.eod/<client>/<today>-weekly.md` and run the checker with `--mode weekly --client ~/.eod/<client>/client.md`.

## Goal

Synthesize the week's EODs into one story the client can read in two minutes. It's a recap of where things got to, not a replay of each day.

## Shape

```
Weekly Recap (<Month D> to <Month D>) 🎯

Hey team! Here's the big picture from this week on <Project>. <one sentence on the week's shape, e.g. short week because of a holiday, but a lot landed>

<Theme heading 1>
<2 to 5 sentences, or a short * list when there are several user-facing features>

<Theme heading 2>
...

Vibes & Reflection 😄
<one paragraph: how the week felt, what clicked, what's next, honest notes on energy>
```

- Headings are themes, not days and not tickets: "Asking questions about the numbers", "Your spreadsheets", "Sorting out the missing login emails", "Getting the app into your hands".
- Biggest milestone first.
- 2 to 5 emojis in the whole recap. Plain-text headings (no `#`, no bold labels).
- Name the trend: "the first half was about getting the app in front of you; the second half was back to building".
- Include open items honestly (what's still in progress, what's waiting on the client) and next week's plan inside the reflection paragraph.
- Time off next week goes in the reflection as a calendar note.

## What not to do

- Don't copy EOD bullets verbatim. Rewrite at a higher level.
- Don't repeat an apology that was already made in a daily EOD; mention the outcome once.
- Don't add anything that wasn't in the week's logs. If a day is missing, ask.
- Internal notes in the logs inform the "Before you send" flags only; they never go in the recap.

## After the recap

Same as daily: run the checker, fix hard findings, return plain text (no code block), then "Before you send:" with risks still open from the week (unverified "fixed" claims, unresolved scope questions to raise with the internal lead, stacked promises for next week).
