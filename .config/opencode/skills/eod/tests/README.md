# EOD clipboard adapter tests

The clipboard engine and browser tests now live in `~/.claude/skills/chat-paste`. This directory tests only EOD-specific preparation and its call into the shared skill.

From `~/.config/opencode`, run:

```sh
python3 -m unittest discover -s skills/eod/tests -p 'test_*.py' -v
python3 skills/eod/scripts/check_eod.py skills/eod/tests/demo.md
python3 skills/eod/scripts/render_eod.py skills/eod/tests/demo.md --no-open
```

The adapter writes `tests/demo.html` using the shared implementation. It contains synthetic client text only; `PRIVATE_DEMO_SENTINEL` must be absent from the complete generated file. The saved `demo.md` must remain unchanged. Tests cover private-note removal, accidental review-label rejection, daily/internal/weekly heading preparation, channel choice, migration of the old generated page signature, and shared browser-opening defaults. `--no-open` prevents automated tests from launching the user's browser.

For clipboard engine tests and destination acceptance, read `~/.claude/skills/chat-paste/tests/README.md`. Check this EOD sample too, in private Slack and Teams/Ferdium destinations: bold sections, paragraph breaks, nested bullets, closing paragraph, emoji, and text must match. The shared generic editor deliberately preserves manually pasted "Internal notes" sections; only the EOD adapter knows which annotations to exclude. Keep raw EOD logs out of the generic editor.
