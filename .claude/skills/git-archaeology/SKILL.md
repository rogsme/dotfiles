---
name: git-archaeology
description: >-
  Use this skill for history-based repository analysis: "git archaeology", contributor
  concentration, ownership history, bus factor, churn trends, fix-keyword hotspots, project
  momentum, or historical risk indicators. Do not use for ordinary source-code analysis or
  generic repository health questions without a Git-history focus. Also triggers on
  "/git-archaeology" and writes GIT-ARCHAEOLOGY.md.
compatibility: Requires Bash 4.3+, Git 2.x, and GNU coreutils (sort with NUL support).
---

# Git Archaeology

Analyze a Git repository's history and write a bounded diagnostic report. Treat
history patterns as indicators to investigate, never as proof of quality,
intent, ownership, or causation.

## Inputs

Accept these independent optional inputs from the user's request:

| Input | Example | Default |
|---|---|---|
| Repository | `/work/services/api` | Current repository |
| Scope | `src/payments` | Entire repository |
| Timeframe | `6 months ago` | Auto-detect, capped at one year |

Never infer whether one path means a repository or a scope. Resolve it against
the current context; if both interpretations remain possible, ask one short
question. Pass inputs to the collector only through the named options:

```bash
bash scripts/collect.sh --repo <repository> --scope <repository-relative-subdirectory> --since <timeframe>
```

Omit unset options. The collector accepts paths containing spaces or beginning
with dashes. Keep `--scope` repository-relative; use `--repo` for the working
tree itself. The automatic timeframe must remain capped at one year.

## Workflow

1. Resolve `scripts/collect.sh` relative to this skill directory and run it with
   the explicit named options above.
2. Stop and report the collector's error if the repository has no commits, the
   scope is invalid, or Git rejects the timeframe.
3. Read `assets/report-template.md` relative to this skill directory.
4. Interpret the bounded data and replace `GIT-ARCHAEOLOGY.md` at the analyzed
   repository root. Always write or replace that file; do not append and do not
   preserve an older report.
5. Return only a 3-5 line summary covering overall indicators, the first area to
   inspect, contributor concentration, and momentum.

Do not paste the full report into the conversation.

## Interpretation

- **Churn:** Distinguish routine churn in tests/configuration from repeated
  changes in core logic. Compare values within the emitted ranking; do not claim
  that churn caused defects.
- **Contributors:** Use the collector's non-merge commit denominator for shares.
  Compare all-time identities with identities active in the selected period.
  Git mailmap normalization is applied, but bots are included and aliases not in
  `.mailmap` may remain split. State this limitation in the report.
- **Fix-keyword clusters:** Describe these as files changed by commits whose
  messages matched the listed keywords. Commit wording is an imperfect proxy,
  not a defect count.
- **Momentum:** Include emitted zero-commit months. Describe acceleration,
  stability, deceleration, irregularity, or seasonality only when the bounded
  series supports it.
- **Firefighting:** Report the matching-commit share using the same non-merge
  denominator. Use it as an operational indicator, not evidence of missing tests
  or deployment quality.
- **Deleted files:** Identify patterns without assigning motive. Deletions can
  indicate cleanup, migration, or abandoned work; history alone cannot choose.
- **Velocity:** Compare the emitted six calendar months, including zeros. Avoid
  conclusions when a file has too few observations.
- **Cross-reference:** Prioritize files present in both bounded churn and
  fix-keyword rankings for inspection. Correlation raises review priority but
  does not establish that a file is defective.

Keep all tables within the collector's limits. Name specific files in
recommendations, and phrase recommendations as checks to perform rather than
diagnoses already proven.
