# Formatter tests

The clipboard renderer lives entirely in this skill. Runtime needs Python 3 and Node.js 20+; the generated page works offline in Chromium. No npm install is needed.

## Automated checks

Run from `~/.config/opencode`:

```sh
node --test skills/eod/tests/formatter.test.cjs
python3 -m unittest discover -s skills/eod/tests -p 'test_*.py' -v
python3 skills/eod/scripts/check_eod.py skills/eod/tests/demo.md
python3 skills/eod/scripts/render_eod.py skills/eod/tests/demo.md
```

The renderer writes `skills/eod/tests/demo.html`. It contains synthetic client text only; the private-note sentinel must be absent from the generated file.

For browser tests, serve only this test directory on localhost in a separate terminal:

```sh
python3 -m http.server 8766 --bind 127.0.0.1 --directory ~/.config/opencode/skills/eod/tests
```

Then run:

```sh
playwright-cli -s=eod-clipboard open http://127.0.0.1:8766/demo.html
playwright-cli -s=eod-clipboard run-code --filename="$HOME/.config/opencode/skills/eod/tests/browser.js"
playwright-cli -s=eod-clipboard close
```

Use a fresh headless browser profile: the tests replace its clipboard with synthetic messages and never open Slack or Teams. The assertions cover the real Chromium copy/paste event path, native Slack MIME data in a separate tab, semantic HTML, private-note exclusion, weekly and internal styles, editing, copy failures, blocked unsafe content, and external requests. Stop the test server afterward. The temporary HTTP server is for test tooling that blocks `file://` URLs; ordinary use opens the generated HTML file directly.

## Destination acceptance: required before claiming perfect formatting

Open `demo.html` in your normal Chromium browser on Linux. Test both buttons in a private Slack destination and Teams' expanded formatting editor inside Ferdium. Do not post in a client channel for this test.

Check all of these in the composer, then in the final rendered message if you approve sending a private test:

- Section headings are bold and retain their emoji.
- Each paragraph break and blank line is present without extra blank lines.
- Bullets use native lists; child and grandchild bullets remain under their parent.
- The closing is a paragraph rather than an extra bullet.
- Internal mode preserves links and converts the two standard emoji shortcodes.
- Weekly mode has bold title and theme headings without bolding the opening paragraph.
- Text, punctuation, and link targets match the preview.

The page's clipboard verification can diagnose missing or changed clipboard data. Passing it does not prove Slack or Teams will interpret that data correctly. Record any destination mismatch, the source text, the app/version, and whether it appears before or after sending. Fix and retest rather than flattening lists or accepting approximate formatting.

Real `@mentions` need selecting in the destination app. Fonts and app-controlled visual spacing are not copied from the preview's UI stylesheet. Unsupported tables, images, raw HTML, checkbox tasks, ambiguous list indentation, and multiline list items block copying explicitly.
