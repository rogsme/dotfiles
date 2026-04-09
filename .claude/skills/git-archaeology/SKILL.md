---
name: git-archaeology
description: >-
  Use this skill when the user asks to "analyze a repo", "check repo health",
  "git archaeology", "codebase diagnostic", "who built this", "what changes the most",
  "bus factor", "churn analysis", "bug hotspots", or wants to understand a codebase's
  history, health, and risk areas before reading source code. Also triggers on
  "/git-archaeology". Generates a structured GIT-ARCHAEOLOGY.md report.
---

# Git Archaeology

Analyze a git repository's history to produce a structured health diagnostic report.
Run a data collection script, interpret the results, and write `GIT-ARCHAEOLOGY.md`
to the repository root with findings, analysis, and recommendations.

## Arguments

The skill accepts optional arguments in this order:

```
/git-archaeology [path] [timeframe]
```

| Argument | Example | Default |
|----------|---------|---------|
| `path` | `src/api`, `packages/core` | Entire repository |
| `timeframe` | `6months`, `2years`, `3 months ago` | Auto-detect (capped at 1 year) |

Examples:
- `/git-archaeology` — full repo, auto timeframe
- `/git-archaeology src/api` — scoped to src/api
- `/git-archaeology 6months` — full repo, last 6 months
- `/git-archaeology src/api 6months` — scoped + custom timeframe

## Workflow

### Step 1: Parse Arguments

Parse the user's input to extract optional `path` and `timeframe` arguments.
Heuristic: if an argument looks like a file path (contains `/` or matches a directory in the repo), treat it as `path`. Otherwise treat it as `timeframe`.

Normalize timeframe strings: `6months` → `6 months ago`, `2years` → `2 years ago`, `1year` → `1 year ago`.

### Step 2: Collect Data

Run the collection script:

```bash
bash ~/.claude/skills/git-archaeology/scripts/collect.sh [--path <path>] [--since <timeframe>]
```

The script outputs structured text with `======== SECTION_NAME ========` delimiters.
It auto-detects project age and caps the lookback at 1 year if no timeframe is provided.

If the script fails (not a git repo, no commits), report the error and stop.

### Step 3: Analyze and Write Report

Read the report template from `~/.claude/skills/git-archaeology/assets/report-template.md`.

For each section, parse the raw data from the script output and write both:
1. **Data tables** with the actual numbers from the script
2. **Narrative analysis** interpreting what the data means

Key analysis guidelines:

**Churn Hotspots:** Distinguish between healthy churn (tests, config, CI) and concerning churn (core business logic, shared utilities). Flag files with >2x the median change count.

**Bus Factor:** Calculate the percentage of commits from the top contributor. Flag if >50%. Compare all-time vs recent contributors — note if original architects are no longer active.

**Bug Clusters:** Cross-reference against churn hotspots immediately. Files on both lists are highest priority. Note if commit message quality limits this analysis (e.g., many generic messages).

**Momentum:** Classify the trend: accelerating, stable, decelerating, erratic, or seasonal. Note any months with zero commits or sudden spikes (>2x average).

**Firefighting:** Rate as none/low/moderate/high based on count relative to total commits. >5% of commits being hotfixes/reverts = high.

**Deleted Files:** Look for patterns: entire directories (feature killed), test deletions (concerning), migrations from one technology to another.

**Churn Velocity:** Flag files where recent months show higher churn than earlier months — these are getting worse. Files with decreasing velocity are stabilizing.

**Cross-Reference:** This is the most important section. Files appearing in both churn and bug lists represent the highest-risk code. Be specific about what to do with each one.

### Step 4: Write the File

Write the completed report to `GIT-ARCHAEOLOGY.md` in the repository root.

After writing, give a brief (3-5 line) summary to the user highlighting:
- The overall health assessment (one sentence)
- The #1 risk area
- The bus factor situation
- Whether momentum is healthy

Do NOT dump the full report into the conversation — the user can read the file.
