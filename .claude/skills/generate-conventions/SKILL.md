---
name: generate-conventions
description: >-
  Use when the user wants to create or update CONVENTIONS.md, document a
  project's coding standards, or establish an evidence-based contributor
  reference. Works with any language or framework and always proposes changes
  for approval before writing.
compatibility: Designed for Claude Code and OpenCode with repository read/write access.
---

# Generate Conventions

Create or update an evidence-based conventions document. The optional argument is a repository-relative output path; default to `CONVENTIONS.md`. Reject paths outside the repository.

## Discovery

Perform one read-only discovery pass before delegation:

1. Read the existing output file fully when present; this selects update mode. Absence selects create mode.
2. Map manifests, package/build files, formatter/linter/type/test configuration, editor settings, CI checks, project instructions, source/test domains, and representative files.
3. Identify only domains actually present, such as frontend, backend, API, data, tests, infrastructure, or documentation.
4. Record evidence with file paths and configuration keys. Sample enough relevant files to distinguish repeated patterns from exceptions.

Use this authority order:

1. Enforced configuration and tooling.
2. Existing authored rules in the output file and other explicit project instructions.
3. Repeated patterns across multiple relevant files.
4. Isolated examples, which are context only and must not become rules.

When enforced configuration conflicts with an authored rule, propose updating the rule and show the exact configuration evidence; never silently rewrite policy. For other conflicts, preserve intentional authored rules and present the conflict for the user. Infer a convention from code only when it repeats across relevant files with concrete evidence and does not contradict a higher authority.

## Focused Analysis

After discovery, launch read-only specialists only for detected domains whose evidence needs deeper analysis. Give each a non-overlapping question and exact scope. Do not use a fixed number of workers or launch specialists for absent domains. Keep simple or single-domain repositories in the main pass.

Relevant analysis may include structure, naming, imports, formatting, types, errors, validation, public APIs, data access, testing, async behavior, logging, documentation, and configuration, but include only what the repository actually demonstrates.

## Proposal And Approval

Do not write in either mode until the user approves the proposed result.

In create mode, present the proposed complete contents or a sufficiently complete section-by-section draft, with evidence for inferred rules. Omit generic advice and inapplicable sections.

In update mode, present a focused diff showing additions, corrections, removals, and preserved intentional rules. For any proposed change to an authored rule, show the conflicting higher-confidence evidence and request explicit approval.

Wait for approval. Apply only approved changes to the output path. Preserve existing organization, voice, and intentional rules where practical; targeted edits are preferred, but deletion is allowed when the user approves stale or redundant content. Do not add an AI-assistance section unless the repository already has an intentional rule or the user requests one.

Use specific, actionable language and short real examples only when they clarify a rule. Mention relevant enforcing tools and configuration paths. Re-read the final file for internal consistency and report mode, path, approved changes, and unresolved conflicts. Do not commit or push.
