# Roger's GSD

The GSD workflow system is a personal fork living at `~/.config/gsd/` — 17 plain
Claude Code skills (`/gsd-*`), no upstream. Read `~/.config/gsd/shared/conventions.md`
for the project layout, pipeline, and commit conventions.

- Edit canonical files in `~/.config/gsd/` only (skills are symlinked into
  `~/.claude/skills/`, so edits are live immediately).
- Reviewer panel for /gsd-review, /gsd-code-review, /gsd-ui-review:
  `~/.config/gsd/shared/reviewers.md` — edit one table row to swap a model.
- Log meaningful changes at the TOP of `~/.config/gsd/CHANGELOG.md`; never edit
  existing entries.
- After structural changes run:

```bash
~/.config/gsd/bin/sync && ~/.config/gsd/bin/check
~/.config/gsd/bin/gen-opencode   # only if skill frontmatter changed
```

The old patch system at `~/.config/gsd-patches/` is retired (history only — do not
run its bin/sync).
