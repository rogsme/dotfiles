---
phase: {NN}-{slug}
plan: {PP}
wave: {N}                    # execution wave (1, 2, 3…); same-wave plans must not share files
depends_on: []               # plan IDs this plan requires, e.g. [01-01]
files_modified: []           # files this plan touches
autonomous: true             # false if plan contains checkpoint tasks
requirements: []             # REQ-IDs from ROADMAP this plan addresses — must not be empty
must_haves:                  # goal-backward verification criteria, consumed by the verifier
  truths: []                 # observable behaviors that must be TRUE
  artifacts: []              # files that must exist (and be substantive)
  key_links: []              # critical connections, e.g. "component X renders state Y"
---

<objective>
{What this plan accomplishes}

Purpose: {why this matters}
Output: {artifacts created}
</objective>

<context>
<!-- Paths the executor must read before starting. Pass paths, not contents. -->
@.planning/PROJECT.md
@.planning/phases/{NN}-{slug}/{NN}-CONTEXT.md
@{path/to/relevant/source}
</context>

<tasks>

<task type="auto">
  <name>Task 1: {action-oriented name}</name>
  <files>{path/to/file.ext}</files>
  <action>{specific implementation instructions}</action>
  <verify>{command or check proving the task worked}</verify>
  <done>{acceptance criteria}</done>
</task>

</tasks>

<verification>
{Overall phase-level checks to run after all tasks complete}
</verification>

<output>
Create `.planning/phases/{NN}-{slug}/{NN}-{PP}-SUMMARY.md` when done.
</output>
