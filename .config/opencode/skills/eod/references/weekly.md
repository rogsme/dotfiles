# Weekly mode

Inputs: this week's client EODs `~/.eod/<client>/YYYY-MM-DD.md` (Monday to today; skip `-internal`, `-test`, `-weekly` and `.notes` files) with their internal notes, plus the `.notes.md` files when you need Roger's own words back. Skip if the client has `weekly: false` unless Roger insists. If days are missing, say which and ask whether to continue or fill them in first.

## Goal

One story the client can read in two minutes: where things got to, not a replay of each day.

Before drafting, write a short private restatement of the week from Roger's new notes and the saved daily restatements (SKILL.md step 2): promises, slips, trades, pride, annoyance, mood. Those organize the themes. A debt and the work traded for it stay together. Everything in the recap comes from the week's logs; ask about missing days instead of filling them.

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

- Headings are themes, not days or tickets: "Asking questions about the numbers", "Your spreadsheets", "Getting the app into your hands".
- Lead with the week's main story, the biggest milestone when that matches Roger's framing.
- Name the trend: "the first half was about getting the app in front of you; the second half was back to building".
- Open items (in progress, waiting on the client), next week's plan and any time off go in the reflection paragraph.
- 2 to 5 emojis in the whole recap. Plain-text headings. PR numbers are optional here.
- Keep his recognizable phrases, humor and mood while condensing technical detail. A resolved daily apology comes back only when it's part of the week's story.
- Private annotations and sensitive internal details stay out, as in SKILL.md step 4.

## Check and deliver

Save as `~/.eod/<client>/<today>-weekly.md` and run `python3 <skill-dir>/scripts/check_eod.py ~/.eod/<client>/<today>-weekly.md --mode weekly --client ~/.eod/<client>/client.md` until zero HARD findings. Review and deliver as in SKILL.md steps 7 and 8, with `--mode weekly` and the week's logs and notes passed to both reviewers. "Before you send" also lists risks still open from the week: unverified "fixed" claims, unresolved scope questions, promises stacked for next week.
