---
name: wiki
description: "Generate and maintain an agentic codebase wiki in docs/wiki/ (DeepWiki-style markdown pages with Mermaid diagrams). Use when the user asks to build, update, sync, audit, or regenerate the project wiki, codebase documentation, or architecture docs, when invoked as /wiki, or when asked to document this codebase or keep the wiki up to date."
license: MIT
metadata:
  rogs-skills/contract: "1"
---

# Codebase Wiki Generator

Maintain a browsable markdown wiki describing this repository in `docs/wiki/`. The wiki is machine-owned: every run may rewrite any page, so treat existing pages as prior output, not as human work to preserve. Write files only. Never run `git add`, `git commit`, or `git push`; committing is the caller's job (a scheduled workflow or the human).

Accuracy beats coverage. Every claim in a page must be something you verified by reading the code in this checkout. A wiki that confidently describes code that no longer exists is worse than no wiki, because readers (human and agent) trust it as context. The wiki describes committed state: when the checkout is dirty (`git status --short` reports changes), verify claims against the working tree where necessary, and say in the summary that uncommitted changes were present, so nobody mistakes a description of uncommitted work for a description of the base branch.

Readers are humans browsing the forge and agents loading pages as context. Both navigate the same path: index, then section hub, then leaf. Every rule below exists to keep that path short and every page on it accurate.

The wiki documents the current implementation only. It never owns the domain glossary, architectural decisions (ADRs), agent configuration and procedures (`docs/agents/`), or ticket specifications: it links to them and defers to them. When `docs/agents/domain.md` exists, it says where the glossary and the ADRs live.

## Invocation and mode selection

The invocation is `/wiki [mode]` where mode is `incremental`, `audit`, or `full`. Rules:

1. Run `full` regardless of the requested mode when any of these hold: `docs/wiki/.wiki-state.json` does not exist; `docs/wiki/.outline.json` is missing, unparseable, or lacks `"outline_version": 2`.
2. If no mode is given, run `incremental`.
3. In `incremental` mode, if `last_generated_sha` is missing or is not a commit in this repo (`git rev-parse --verify <sha>^{commit}` fails, for example after a history rewrite), there is no diff base: escalate to `audit` and say so in your summary. Audit verifies every page against the current code, which covers whatever the lost diff would have shown.
4. In `incremental` mode, if the diff since the last run touches more than ~40% of tracked source files, escalate to `audit` and say so in your summary.

Runs are time-bounded and the caller may cancel one. Write `.wiki-state.json` last, so a cut-off run leaves the previous SHA in place and the next run re-processes the same diff.

Do every step in your own turn. Never hand page writing to subagents or background tasks: a headless run ends when your turn ends, so work still running elsewhere is lost while the run reports success.

## Layout

The wiki is two levels deep: root and sections.

| Path | Role |
|---|---|
| `docs/wiki/README.md` | Index. The only page every reader starts from. |
| `docs/wiki/<page>.md` | Root page. Spans more than one section. Always present: `architecture-overview.md`, `getting-started.md`. |
| `docs/wiki/<section>/README.md` | Hub. The landing page for one seam. The forge renders it when a reader browses into the directory. |
| `docs/wiki/<section>/<page>.md` | Leaf. One seam within the section. |
| `docs/wiki/.outline.json` | The page map: the contract that makes incremental updates possible. |
| `docs/wiki/.wiki-state.json` | Run state. |

A **seam** is a boundary the code already has: a package, a service, a subsystem, a pipeline stage, a bounded set of modules that change together. Pages follow seams, never file types or a generic template.

Sections are earned. A section exists when one seam yields two or more leaves. A repo whose whole outline is three to six leaves has no section directories: the index is the only hub and the leaves sit beside it at the root. A seam that fits on one page gets `<section>/README.md` alone, hub and leaf in one file. There is never a third level: if a section wants one, raise the abstraction of its leaves instead. Decide all of this from `git ls-files` and the code, never from a fixed list of directory names.

## `.outline.json`

```json
{
  "outline_version": 2,
  "root_pages": [
    {
      "file": "architecture-overview.md",
      "title": "Architecture Overview",
      "covers": ["README.md", "AGENTS.md"],
      "seeds": ["README.md"]
    }
  ],
  "sections": [
    {
      "dir": "api",
      "title": "API Service",
      "covers": ["api/**"],
      "pages": [
        {
          "file": "api/auth-and-sessions.md",
          "title": "Auth and Sessions",
          "covers": ["api/src/auth/**", "api/src/middleware/session.*"],
          "seeds": ["api/src/auth/service.*"]
        }
      ]
    }
  ]
}
```

- `covers` on a leaf or root page is the set of paths/globs whose changes make that page suspect.
- `covers` on a section is the fallback for the whole seam: any file in the section's tree that no leaf claims (configs, lockfiles, READMEs, one-file directories) belongs to the hub.
- `seeds` are the 1 to 5 files to start reading from when writing the page.
- A section with a single page has `pages: []`; its `README.md` is written from the section's own `covers` and `seeds` (add `seeds` on the section in that case).

**Ownership rule:** every non-excluded tracked path resolves to exactly one page. Resolution is most-specific-glob-wins (the longest matching pattern). Leaf `covers` inside a section must not overlap each other; a path matching two leaves is a defect to fix in the outline, and the self-check reports it.

**Order of writes:** a page is written to disk before its entry is added to `.outline.json`, and a page dropped from the outline is deleted from disk in the same step. A cut-off run must never leave an outline entry without its page, or a page without its entry.

Two shapes the outline takes. A small single-service repo:

```
docs/wiki/
  README.md
  architecture-overview.md
  getting-started.md
  request-pipeline.md
  persistence.md
  background-jobs.md
```

A monorepo with two packages, one of which fits on a page:

```
docs/wiki/
  README.md
  architecture-overview.md
  getting-started.md
  web/
    README.md              hub: directory map, diagram, page table
    routing-and-shell.md
    auth.md
    rendering.md
    tooling-and-tests.md
  worker/README.md         hub and leaf in one file
  operations/
    README.md
    ci-workflows.md
    agent-configuration.md
```

`.wiki-state.json`:

```json
{"last_generated_sha": "<full sha>", "generated_at": "<ISO 8601 UTC>", "mode": "incremental"}
```

Get the SHA with `git rev-parse HEAD`. Rewrite this file at the end of every successful run; audit and full runs rewrite it even when no page changed. The caller reads its SHA and `generated_at` to tell a finished run from a cut-off one.

## Page sizing and splitting

A page is one seam, sized so a reader finishes it in one sitting and an agent can load it whole:

- A leaf covers typically 3 to 15 project-authored files and runs 300 to 1,500 words. Over 1,500 words is a split candidate; over 2,500 words splits in the same run, whatever the mode, with the new leaf added to the outline and the hub.
- A leaf has at most 7 H2 sections, and its H2s share one concern. Concerns are stack-neutral: bootstrap and configuration; auth and access control; request handling and routing; domain logic; data model and persistence; UI and rendering; external integrations; safety and compliance; tooling and tests. A page whose H2s straddle two concerns splits along that line. Read the concerns off the code; the list above is a vocabulary, not a template.
- A paragraph is at most ~120 words. Inventories (test files, routes, config keys, commands, environment variables) are tables.
- A section with more than ~8 leaves splits into two sections. A one-file directory is a row in the hub's directory map, never a page.
- Hubs run under ~600 words. The index runs under ~800.
- Vendored and generated directories get one row in the hub's directory map and one sentence on how they are produced, plus the local maintenance policy when the repo documents one (in its agent rules or README). Read that policy; never assume one.

## Page templates

Every page starts with this banner, values filled in:

```markdown
> Auto-generated by the wiki skill from commit `<short sha>` on <YYYY-MM-DD>. Do not edit by hand; changes will be overwritten.
```

**Index** (`docs/wiki/README.md`), in order:

1. Banner, H1, overview: what the project is and how it runs, two paragraphs at most.
2. One table per section (and one for root pages) with columns `Page | Summary | Key paths`. Summary is one sentence; key paths are the two or three directories the page is about.
3. `## Reading order`: a numbered list of 4 to 6 pages for a newcomer.
4. `## For agents`: two sentences stating that the lookup path is index, hub, leaf, and that `.outline.json` maps source paths to pages.

**Hub** (`docs/wiki/<section>/README.md`), in order:

1. Banner, H1, orientation: what the seam is and where it lives, one paragraph.
2. `## Directory map`: a table `Path | What lives there | Page` with one row per top-level subdirectory and config file of the seam. Vendored and generated directories are rows too, marked as such. The Page column links the leaf that owns the row, or says "this page".
3. One Mermaid diagram of the seam: module dependencies or the main flow through it.
4. `## Pages`: a table `Page | Summary`.
5. `## Cross-cutting`: links to the root pages and other sections this seam touches.
6. A final line linking back to the index: `Back to [the index](../README.md).`

**Leaf** (`docs/wiki/<section>/<page>.md`, and root pages), in order:

1. Banner, H1, orientation: one paragraph on what this seam does and where its code lives.
2. `## Key files`: a table `Path | Role` of the 3 to 10 files that matter most, each path a relative link into the repo: one `../` per directory level between the page and the repo root, so a page at `docs/wiki/<section>/<page>.md` uses `../../../path/to/file` and a root page at `docs/wiki/<page>.md` uses `../../path/to/file`.
3. H2 sections describing purpose, structure, key flows, and interactions. A Mermaid diagram wherever the page describes a flow, a state machine, or a handoff between components; a sentence wherever a sentence is enough.
4. `## Related`: links to the hub, the sibling pages this page references, and the pages in other sections it depends on. Root pages link the index here instead of a hub.

## Page conventions

- Reference code by path and symbol (`src/auth/service.py`, `SessionStore.refresh()`), never with large pasted code blocks. Snippets over ~10 lines defeat the purpose; the reader has the repo.
- Link pages with relative links (`[Auth](auth.md)`, `[Worker](../worker/README.md)`), anchors allowed (`auth.md#session-refresh`).
- Describe what the code does today, in the present tense, as if the page were written fresh this run. Roadmaps, intent, and history belong in commits, ADRs, and tickets. If behavior looks like a bug, describe the behavior, not your guess about what was meant.
- **Single source.** A fact lives on exactly one page; other pages link to it. When two pages both need a fact, the owner is the page whose `covers` includes the file that defines it. Domain definitions live in the glossary and decisions in the ADRs: the wiki links to those instead of restating them.
- Never copy values of secrets, tokens, API keys, connection strings, or `.env` contents into a page, even values found committed in the repo. Name the config key, never the value.

Writing style: plain, specific, low ceremony. Concretely:

- Punctuate with commas, colons, semicolons, periods, and parentheses. Em dashes are banned; the self-check greps for them.
- Say what the thing does: "X does Y" over "X serves as / is responsible for Y". Show that something is simple rather than asserting it.
- Plain vocabulary: delve, leverage, robust, seamless, streamline, comprehensive, and "plays a crucial role" are banned, as are bold-label bullets (`**Performance**: ...`) and negative parallelism ("it's not X, it's Y").

## What to exclude

Skip vendored dependencies, generated code, lockfiles, build output, fixtures/snapshots, minified bundles, and `docs/wiki/` itself. Use `git ls-files` as the source of truth for what is tracked, then apply judgment: if a directory is clearly machine-written (codegen output, migrations dumps, registry-pulled components), document that it exists and how it is produced, not its contents.

## Full mode

1. Inventory: `git ls-files`, apply exclusions, read the README and obvious entrypoints (main modules, app factories, CLI definitions, CI config) to understand what the project is.
2. Write `.outline.json`: find the seams, decide which earn sections, assign `covers` so the ownership rule holds, pick `seeds`.
3. Write each leaf and single-page section: start from its seeds, then explore (follow imports, find callers, check config defaults) until you can describe the seam's purpose, structure, key flows, and interactions. Verify claims against code you actually read. Apply the sizing rules as you go; split before writing rather than after.
4. Write each hub from its finished leaves, then the root pages, then the index last, so each reflects the pages that exist.
5. Remove any `docs/wiki/**/*.md` not in the new outline (`rm docs/wiki/<path>`); an emptied directory may stay. Run the self-check. Write `.wiki-state.json`.

## Incremental mode

1. Read `.wiki-state.json` and `.outline.json`. Compute changes: `git diff --name-status <last_generated_sha>..HEAD -- . ':(exclude)docs/wiki'`. If the diff is empty, update nothing (you may still rewrite `.wiki-state.json`) and report a no-op. Commits after `last_generated_sha` that touch only `docs/wiki/` are not evidence that their diff was processed: a cut-off run commits partial pages without advancing the state file. The state file is the only record of what was processed; never narrow the diff by reasoning about those commits.
2. Resolve each changed path to its owning page via the ownership rule. A path that resolves to no page means the outline has a gap: assign it to the best-fitting existing page (extend its `covers`) or, if it belongs to a genuinely new seam, add a page or section.
3. For each affected page: read the diff for its files (`git diff <last_sha>..HEAD -- <paths>`) to learn where to look, then rewrite the whole page from the current code, using the old page only as a checklist of topics to re-verify. A page is a fresh description, never an edit log. Renames and deletions are reflected; a page whose entire subject was deleted is removed from disk and from the outline. Apply the sizing rules: a page that grew past its bounds splits now.
4. Rewrite the hub of every section whose leaves changed (directory map and page table included). Rewrite the index tables whenever any page was written, added, removed, or retitled. Both are short; keeping them current on every run is what stops the index going stale.
5. Run the self-check. Write `.wiki-state.json`.

## Audit mode

The periodic safety net. Incremental runs can each correctly conclude "no page change needed" while ten of them together leave a page wrong. Audit exists to catch that drift plus structural rot.

1. Re-derive an outline from the current tree as if running full mode, but don't write it yet. Compare with `.outline.json`: seams that grew enough to deserve their own page or section, pages whose subject shrank or vanished, tracked paths no page owns, leaves whose `covers` overlap, pages outside the sizing bounds. Apply the structural fixes (add/split/merge/remove pages; new or split pages are written as in full mode). Structural decisions are sticky: a split or merge made by an earlier run stands unless the code moved or a hard bound is exceeded, so audits do not oscillate on word counts alone.
2. For every surviving page, oldest banner SHA first: confirm each path in `covers` still exists, then verify the page's main claims against the current code (entry points it names, flows it describes, config keys it references). Rewrite what drifted. A page that passes keeps its banner untouched, so a clean audit produces no churn; say which pages passed.
3. Rewrite hubs and the index if the page set changed. Run the self-check. Write `.outline.json` and `.wiki-state.json`.

## Self-check

Run before writing `.wiki-state.json` in every mode. Fix what fails; anything you cannot fix goes in the summary.

| Check | How |
|---|---|
| Links resolve | For every `](<path>.md` target, Glob the file relative to the linking page; for anchors, confirm a heading in the target produces that slug. |
| Navigation is two-way | Every leaf is in its hub's page table and links the hub in `## Related`; every hub and root page is in the index; every hub links the index. |
| Present tense | Grep pages for em dashes (U+2014), for `\b(now|recently|no longer|previously|used to)\b`, for ticket and PR references (`\b[A-Z]{2,}-\d+\b`, `#\d+\b`), and for bold-label bullets (`^- \*\*[^*]+\*\*:`). Rewrite each hit. |
| Sizes | `wc -w` on every page against the bounds in Page sizing. |
| Ownership | Every tracked, non-excluded path resolves to exactly one page. Enumerate with `git ls-files <glob>` per pattern; list gaps and overlaps. |
| Outline matches disk | Every page in `.outline.json` exists on disk, and every `docs/wiki/**/*.md` (index and hubs included) is in the outline. Delete strays with `rm docs/wiki/<path>`; never leave a redirect stub in place of a deletion. |
| Banners | Every page written this run carries `git rev-parse --short HEAD` and today's date. |

## Reporting

End every run with a short summary: mode actually run (and why, if escalated); the page tree with word counts; pages created, updated, deleted, and verified unchanged; self-check results (gaps, overlaps, unresolvable links); whether `.wiki-state.json` was written; whether the checkout was dirty; and anything that needs a human (huge uncovered directory, suspected bug, unparseable state). Keep it to a screen; it may land in a workflow log.
