# Chat-paste tests

Runtime needs Python 3 and Node.js 20+. The browser assets are bundled; no npm install is needed. Tests use synthetic messages and do not open Slack, Teams, or Ferdium.

## Automated checks

```sh
node --test ~/.claude/skills/chat-paste/tests/*.test.cjs
python3 -m unittest discover -s ~/.claude/skills/chat-paste/tests -p 'test_*.py' -v
python3 ~/.claude/skills/chat-paste/scripts/render_message.py ~/.claude/skills/chat-paste/tests/demo.md --output ~/.claude/skills/chat-paste/tests/demo.html --no-open
```

The last command writes `tests/demo.html`. `--no-open` keeps automated tests from launching the user's browser; ordinary delivery opens it by default. For browser tests, serve only this test directory in a separate terminal:

```sh
python3 -m http.server 8766 --bind 127.0.0.1 --directory ~/.claude/skills/chat-paste/tests
```

Then run:

```sh
playwright-cli -s=chat-paste-test open http://127.0.0.1:8766/demo.html
playwright-cli -s=chat-paste-test run-code --filename="$HOME/.claude/skills/chat-paste/tests/browser.js"
playwright-cli -s=chat-paste-test close
```

Use a fresh headless profile. These tests replace only that browser's clipboard with synthetic messages. They check real copy/paste, native Slack MIME in another tab, semantic HTML, typing, failure handling, and absence of external requests. They also verify that supplied "Internal notes" sections and review labels remain part of the message. Tests run with this skill alone, without another workflow installed.

The Chromium test also exercises the HTML route with a Firefox-like user agent. That is a routing test, not a real Firefox test. To test actual Firefox, use Node 22+ and the installed `firefox` binary:

```sh
node ~/.claude/skills/chat-paste/tests/firefox.cjs
```

This uses WebDriver BiDi, creates a fresh headless profile under `/tmp/opencode`, opens the generated `file://` demo, and checks real Firefox copy/paste and cross-tab HTML structure. No Playwright Firefox download is needed. Set `FIREFOX_BINARY` to another Firefox-compatible executable if needed. It closes its own browser and removes only its disposable profile. It never reads the user's browser profile or opens a destination app.

Stop the test server afterward. The HTTP server is only for test tooling that blocks `file://` URLs; ordinary use opens the generated file directly.

## Destination acceptance

Open `demo.html` in your normal browser on Linux, including Firefox/Zen, and test both copy buttons in private Slack and Teams/Ferdium destinations. Chromium supplies native Slack rich text; Firefox/Zen supplies semantic HTML. A successful HTML clipboard check does not prove that Slack interprets every feature the same way as its native format. Check the composer and, with approval, a final private test message:

- Intended heading emphasis and all paragraph/blank-line breaks match.
- Native lists preserve both child and grandchild nesting.
- Words, punctuation, emoji, link labels, and link targets match.
- Plain ALL CAPS text remains plain unless explicitly marked as a heading.
- A supplied "Internal notes" section remains present for standalone use.

Clipboard inspection stays in the automated tests; there is no verification pane in the preview. The tests also check a collapsed editor, light/dark switching, remembered preferences, and absence of browser-protocol warnings. Firefox tests verify theme persistence across different `file://` previews. Record the source and app/version for any destination mismatch and fix the conversion. Real mentions need selecting in the destination app. Fonts and app-controlled visual spacing are not copied from the preview's stylesheet.
