# EOD tests

These tests cover PR inclusion, EOD preparation, and standalone plain-text delivery. Optional clipboard export is tested through a public CLI when a formatter is installed; formatter-specific browser tests belong to that formatter.

From `~/.config/opencode`, run:

```sh
python3 -m unittest discover -s skills/eod/tests -p 'test_*.py' -v
python3 skills/eod/scripts/check_eod.py skills/eod/tests/demo.md
python3 skills/eod/scripts/render_eod.py skills/eod/tests/demo.md --no-open
```

With the optional formatter installed, the adapter writes `/tmp/opencode/demo.html`. It contains synthetic client text only; `PRIVATE_DEMO_SENTINEL` must be absent from the complete generated file. Without the formatter, the adapter reports that export was skipped and leaves the checked draft ready for plain-text delivery. The saved `demo.md` remains unchanged in both cases. Tests cover privacy, review-label rejection, heading preparation, channel choice, legacy preview migration, the public stdin/output handoff, and browser opening only with explicit `--open`. Integration tests use unique preview names and remove only their own output. Automated exports use `--no-open`.

PR coverage tests use synthetic gather JSON. MERGED, OPENED and WORKED ON PRs are required in the public body as `#N`, `owner/repo#N`, or the PR URL; ACTIVITY and CLOSED are reported as FYI. A number shared by two repos needs `owner/repo#N`. Titles, internal notes, generic housekeeping and duplicate mentions don't count. A missing or invalid inventory is a hard finding. `--skip-pr owner/repo#number` removes a PR from the required set and is only for Roger's explicit skips. Render tests also check that an in-review lead-in stays a paragraph rather than becoming a heading, and that `--open`/`--no-open` pass through in all three delivery modes. How PRs are grouped and explained is prose quality, evaluated with the private replay cases.

Standalone tests use an isolated home without the optional formatter and a PATH without Node.js. Integration tests are skipped if the formatter is absent. When testing an export in a private destination, check bold sections, paragraph breaks, nested bullets, the closing paragraph, emoji, and text. The adapter owns exclusion of private notes; the formatter receives only finished public Markdown.
