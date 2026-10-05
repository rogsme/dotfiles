# EOD clipboard adapter tests

These tests cover EOD preparation and standalone plain-text delivery. Optional clipboard export is tested through a public CLI when a formatter is installed; formatter-specific browser tests belong to that formatter.

From `~/.config/opencode`, run:

```sh
python3 -m unittest discover -s skills/eod/tests -p 'test_*.py' -v
python3 skills/eod/scripts/check_eod.py skills/eod/tests/demo.md
python3 skills/eod/scripts/render_eod.py skills/eod/tests/demo.md --no-open
```

With the optional formatter installed, the adapter writes `tests/demo.html`. It contains synthetic client text only; `PRIVATE_DEMO_SENTINEL` must be absent from the complete generated file. Without the formatter, the adapter reports that export was skipped and leaves the checked draft ready for plain-text delivery. The saved `demo.md` remains unchanged in both cases. Tests cover privacy, review-label rejection, heading preparation, channel choice, legacy preview migration, the public stdin/output handoff, and formatter-owned browser defaults. `--no-open` prevents automated tests from launching the user's browser.

Standalone tests use an isolated home without the optional formatter and a PATH without Node.js. Integration tests are skipped if the formatter is absent. When testing an export in a private destination, check bold sections, paragraph breaks, nested bullets, the closing paragraph, emoji, and text. The adapter owns exclusion of private notes; the formatter receives only finished public Markdown.
