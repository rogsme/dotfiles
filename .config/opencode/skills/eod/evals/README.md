# EOD evals

Replays past days through the EOD agent so you can compare setups (drafter alone vs drafter plus both reviewers, or different models) against known answers.

Cases contain real client notes, so they never live in this folder. Keep them in `~/.eod/evals/cases/` (or point `EOD_EVAL_CASES` somewhere else).

## Case format

```
~/.eod/evals/
  scorecard.md                  optional; copied into each results folder
  cases/<case-name>/
    case.env                    TODAY="Friday 2026-10-02"  YESTERDAY="2026-10-01"  CLIENT="<client-slug>"
    notes.md                    the raw notes for that day, verbatim
    yesterday.md                optional; the EOD sent the day before (continuity checks)
    client.md                   optional; frozen client config for this case, else ~/.eod/<client>/client.md
    prs.json                    optional; todays_prs.py --json output for that day (enables the coverage check)
    expected.md                 what a good run must catch, must not do, and should include
```

`expected.md` works best as checklists under three headings: **Must catch** (risks the run should flag or handle), **Must not do** (leaks, false alarms, wrong claims) and **Should include**.

## Running

```
~/.config/opencode/skills/eod/evals/run.sh <client repo checkout> solo
~/.config/opencode/skills/eod/evals/run.sh <client repo checkout> review
```

Pass case names after the variant to run a subset. Results go to `~/.eod/evals/results/<timestamp>-<variant>/`: one transcript per case plus the log folder the agent wrote.

## Scoring

Per case: catches (out of "Must catch"), violations (any "Must not do" that happened; worse than a missed catch, since a leak reaches the client), false alarms (flags that are wrong or noise), and whether you'd paste the draft with light edits.
