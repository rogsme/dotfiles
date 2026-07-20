# Git Archaeology Report

> **Repository:** {{repo_name}}
> **Analyzed:** {{date}}
> **Timeframe:** {{timeframe}}
> **Scope:** {{scope}}
> **Total commits:** {{total_commits}} | **Contributors:** {{total_contributors}}

---

## Executive Summary

{{2-3 sentence assessment of the strongest indicators. Lead with the first area to inspect, state uncertainty, and mention the most positive signal.}}

### Where to Look First

{{Prioritized list of 3-5 files or areas that deserve immediate attention, with one-line reasons.}}

---

## 1. Churn Hotspots

> Files most frequently modified. Churn indicates activity and review priority, not instability by itself.

| Rank | File | Changes |
|------|------|---------|
{{top 20 rows}}

**Analysis:** {{Describe file categories and concentration. Flag disproportionate churn for inspection, but do not label a file healthy or unstable from its path or change count alone.}}

---

## 2. Contributors & Concentration

### All-Time Contributors

| Contributor | Commits |
|-------------|---------|
{{top rows}}

### Active in Analysis Period

| Contributor | Commits |
|-------------|---------|
{{top rows}}

**Contributor Concentration:** {{Using the collector's non-merge denominator, report top shares for all time and the analysis period. Note that .mailmap is applied, bots remain included, and unresolved aliases may be split. Do not infer maintainership or knowledge solely from commits.}}

---

## 3. Fix-Keyword Clusters

> Files changed by commits matching fix-related keywords. This is a message-based indicator, not a defect count.

| Rank | File | Matching Commits |
|------|------|-----------------|
{{top 20 rows}}

**Analysis:** {{Which areas recur in matching commits? Are these also churn hotspots? State how commit-message quality limits the indicator; do not claim the files caused defects.}}

---

## 4. Project Momentum

> Recorded commit frequency over time. This series does not by itself identify staffing or delivery changes.

| Month | Commits |
|-------|---------|
{{monthly rows}}

**Trend:** {{Classify as accelerating, stable, decelerating, irregular, or seasonal only if supported. Include zero months and list possible explanations as unverified questions, not causes.}}

---

## 5. Firefighting-Keyword Frequency

> Commits matching revert, hotfix, emergency, rollback, urgent, or critical-fix keywords.

{{List of matching commits, or "(none found)"}}

**Assessment:** {{Report the matching share using the same non-merge denominator. Treat it as an indicator and suggest concrete checks; do not infer root causes from messages alone.}}

---

## 6. Deleted Files

> Files deleted during the period. History alone does not establish why they were removed.

| File | Times Deleted |
|------|---------------|
{{rows}}

**Analysis:** {{Describe deletion patterns and plausible interpretations to verify. Do not assign motive or label cleanup/abandonment as fact from history alone.}}

---

## 7. Churn Velocity

> Monthly change frequency for the highest-churn files, including zero months.

{{For each top file, show monthly breakdown}}

**Analysis:** {{Which files show increasing, decreasing, or irregular activity? Call this an indicator and avoid conclusions when observations are sparse.}}

---

## 8. Overlap Indicator

> Files appearing in both bounded churn and fix-keyword rankings; inspect these first.

| File | Churn Rank | Bug Rank |
|------|------------|----------|
{{overlap rows, or "(no overlap found in the bounded rankings)"}}

**Assessment:** {{Explain that overlap increases review priority but does not prove defects or failed fixes. Recommend targeted inspection and tests based on the actual files.}}

---

## Recommendations

{{3-5 actionable checks based on the indicators above. Name files and suggest evidence-gathering steps such as review, focused tests, or ownership confirmation.}}
