# EOD tests

These tests cover PR inclusion, EOD preparation, and standalone plain-text delivery. Optional clipboard export is tested through a public CLI when a formatter is installed; formatter-specific browser tests belong to that formatter.

Agent permission tests check the configured allowlist for preview edits, external formatter directories and pinned formatter commands, while retaining denials for unrelated paths and inline Python. They inspect the frontmatter policy, not a running OpenCode session. Renderer tests cover shared-skill discovery with legacy fallback and destination overrides with private-note filtering.

From `~/.config/opencode`, run:

```sh
python3 -m unittest discover -s skills/eod/tests -p 'test_*.py' -v
python3 skills/eod/scripts/check_eod.py skills/eod/tests/demo.md
python3 skills/eod/scripts/render_eod.py skills/eod/tests/demo.md --no-open
```

With the optional formatter installed, the adapter creates a chat-paste session under `/tmp/opencode/eod-chat-paste/` and prints its paths as JSON. Its public Markdown snapshots and HTML contain synthetic client text only; `PRIVATE_DEMO_SENTINEL` must be absent. Pass the printed session back with `--session` for revisions. With `--open`, the adapter also opens the viewer and reports its URLs and browser-launch status. Without the formatter, it reports that export was skipped and leaves the checked draft ready for plain-text delivery. The saved `demo.md` remains unchanged in both cases. Tests cover privacy, review-label rejection, heading preparation, channel choice, preservation of old previews, the file-based Node CLI handoff, revision reuse, and opening only with explicit `--open`. Integration tests use isolated artifact roots and remove only their own output. Automated exports use `--no-open`.

PR coverage tests use synthetic gather JSON. MERGED, OPENED and WORKED ON PRs are required in the public body as `#N`, `owner/repo#N`, or the PR URL; ACTIVITY and CLOSED are reported as FYI. A number shared by two repos needs `owner/repo#N`. Titles, internal notes, generic housekeeping and duplicate mentions don't count. A missing or invalid inventory is a hard finding. `--skip-pr owner/repo#number` removes a PR from the required set and is only for Roger's explicit skips. Render tests also check that an in-review lead-in stays a paragraph rather than becoming a heading, and that `--open`/`--no-open` pass through in all three delivery modes. Vault pass tests build a synthetic vault in a temporary folder with made-up clients and people: Capture bullets that link another client are dropped, Log action items are kept only for this client, meetings are tagged client-attended or internal-only from their attendees, unfiled inbox material or a missing daily makes the vault NOT READY, and `obsidian:` in client.md overrides or turns off the pass. How PRs are grouped and explained is prose quality, evaluated with the private replay cases.

Standalone tests use an isolated home without the optional formatter and a PATH without Node.js. Integration tests are skipped if the formatter is absent. When testing an export in a private destination, check bold sections, paragraph breaks, nested bullets, the closing paragraph, emoji, and text. The adapter owns exclusion of private notes; the formatter receives only finished public Markdown.
