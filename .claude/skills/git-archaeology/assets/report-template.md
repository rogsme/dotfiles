# Git Archaeology Report

> **Repository:** {{repo_name}}
> **Analyzed:** {{date}}
> **Timeframe:** {{timeframe}}
> **Scope:** {{scope}}
> **Total commits:** {{total_commits}} | **Contributors:** {{total_contributors}}

---

## Executive Summary

{{2-3 sentence overall health assessment. Lead with the most important finding. Mention the biggest risk and the most positive signal.}}

### Where to Look First

{{Prioritized list of 3-5 files or areas that deserve immediate attention, with one-line reasons.}}

---

## 1. Churn Hotspots

> Files most frequently modified — high churn often signals instability or active development.

| Rank | File | Changes |
|------|------|---------|
{{top 20 rows}}

**Analysis:** {{Interpret the pattern. Are these config files (normal churn), core business logic (concerning), or tests (healthy)? Flag any file with disproportionate churn.}}

---

## 2. Contributors & Bus Factor

### All-Time Contributors

| Contributor | Commits |
|-------------|---------|
{{top rows}}

### Active in Analysis Period

| Contributor | Commits |
|-------------|---------|
{{top rows}}

### Active in Last 6 Months

| Contributor | Commits |
|-------------|---------|
{{top rows}}

**Bus Factor Assessment:** {{Calculate: does the top contributor account for >50% of commits? Have original architects left? How many people could maintain this if the top contributor disappeared?}}

---

## 3. Bug Clusters

> Files most associated with bug-fix commits (keywords: fix, bug, broken, patch, issue, defect).

| Rank | File | Bug-Fix Commits |
|------|------|-----------------|
{{top 20 rows}}

**Analysis:** {{Which areas keep breaking? Are these the same files as the churn hotspots? Note if commit message quality limits this analysis.}}

---

## 4. Project Momentum

> Commit frequency over time — reveals team dynamics, staffing changes, and delivery rhythm.

| Month | Commits |
|-------|---------|
{{monthly rows}}

**Trend:** {{Classify as: accelerating, stable, decelerating, erratic, or seasonal. Note any sharp drops or spikes and hypothesize causes.}}

---

## 5. Firefighting Frequency

> Reverts, hotfixes, emergencies, and rollbacks — frequent firefighting signals deployment or testing gaps.

{{List of matching commits, or "(none found)"}}

**Assessment:** {{Rate firefighting level: none/low/moderate/high. If high, suggest likely root causes (missing tests, no staging, difficult rollbacks).}}

---

## 6. Deleted Files

> Recently deleted files — signals refactoring, feature removal, or abandoned approaches.

| File | Times Deleted |
|------|---------------|
{{rows}}

**Analysis:** {{Is this healthy cleanup or abandoned work? Look for patterns: entire directories removed (feature killed), test files removed (concerning), config files removed (migration).}}

---

## 7. Churn Velocity

> Monthly change frequency for the highest-churn files — catches accelerating problem areas.

{{For each top file, show monthly breakdown}}

**Analysis:** {{Are any files getting worse over time (accelerating churn)? Are any stabilizing? Flag files where recent months show higher churn than earlier months.}}

---

## 8. High-Risk Cross-Reference

> Files appearing in BOTH the churn hotspot and bug cluster lists — these are the highest-risk code.

| File | Churn Rank | Bug Rank |
|------|------------|----------|
{{overlap rows, or "(no overlap — good sign)"}}

**Assessment:** {{These files keep breaking and keep getting patched but never get properly fixed. Prioritize review and potential refactoring.}}

---

## Recommendations

{{3-5 actionable recommendations based on the findings above. Be specific: name files, suggest approaches (refactor, add tests, document, assign ownership).}}
