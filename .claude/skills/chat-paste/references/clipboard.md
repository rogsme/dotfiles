# Clipboard implementation and validation

## Delivery paths

- Slack in Chromium: `slack/texty` Quill Delta, `text/html`, and `text/plain` in a copy event. Chromium packages the custom MIME so Slack Electron can read it as native rich text. Async Clipboard's `web slack/texty` is a different format and is not a substitute.
- Slack in Firefox/Zen and other non-Chromium browsers: `text/html` and `text/plain`, using the same semantic HTML model as Teams. This is a rich-HTML path, not a plain-text fallback. Firefox's custom-MIME packaging differs from Chromium's, so writing `slack/texty` there would not prove native Slack Electron compatibility. Keep these details here for diagnosis; the user-facing preview omits protocol warnings.
- Teams: `text/html` and `text/plain`. The semantic HTML uses paragraphs, real lists, inline emphasis, safe links, quotes, and code. UI styling is not copied as a Slack or Teams theme.
- Plain-text button: an explicit unformatted choice, never an automatic fallback after a rich-copy failure.

One parsed message model produces the preview HTML, plain text, and Slack Delta. List attributes belong on Delta newline operations. The formatter checks source indentation independently so a Markdown parser cannot silently turn child bullets into root bullets.

Heading styles come from explicit Markdown. Unicode `•` bullets are recognized. Common emoji shortcodes are converted to Unicode; unknown or workspace-specific names fail with a request to supply the Unicode emoji. Private-note removal and audience policy are caller responsibilities.

## Privacy and failure behavior

The generated page embeds all scripts and has a restrictive Content Security Policy. It does not upload, fetch external scripts, store browser edits, or send messages. Only the light/dark preference is stored in browser local storage; disabled storage does not prevent copying or switching themes. Source HTML and unsafe link protocols are rejected. Clipboard verification is implemented in automated tests rather than a preview pane.

Generated pages contain message content, so the writer creates them with owner-only permissions and replaces them atomically. It refuses to overwrite unrelated files or symlinks. Do not publish client messages or put their contents into command-line arguments.

For copy failures, check a direct click on the button, browser clipboard permissions, and normal rich-text paste rather than paste-as-plain-text. Firefox/Zen is allowed to copy rich HTML; switching browsers is not the default fix. Automated tests inspect the actual selected format: HTML and plain text for rich HTML, plus Delta for Chromium's native Slack path. If clipboard data is intact but the destination differs, record the source and app/version and fix the destination conversion. Do not flatten lists to hide the problem.

## Test and maintenance paths

Run `tests/*.test.cjs` with `node --test` and `tests/test_render_message.py` with Python unittest. `tests/preview.test.cjs` locks down browser routing and fail-closed behavior. `tests/browser.js` exercises real Chromium clipboard round-trips and the HTML path with a Firefox-like user agent. `tests/firefox.cjs` tests the installed Firefox with its own headless profile and real clipboard events. See `tests/README.md` for commands and destination acceptance.

The native Slack clipboard protocol is undocumented; retest after Slack updates. The vendored Marked parser is pinned at 18.1.0 with its MIT license in `assets/vendor/marked-LICENSE.md`. `scripts/vendor_marked.py` refreshes the pinned package only after SHA-512 verification. This is a maintainer action, not part of ordinary skill runs.

## Sources

- Workflow inspiration: https://github.com/davepoon/buildwithclaude/blob/main/plugins/all-skills/skills/slack-message-formatter/SKILL.md
- Native Slack clipboard format: https://github.com/cauethenorio/slackfmt/blob/main/packages/clipboard/README.md
- Browser copy-event implementation reference: https://github.com/cauethenorio/slackfmt/blob/main/packages/web/src/utils/clipboard.ts
- Markdown lexer: https://marked.js.org/using_pro
- Slack rich-text versus markup-only composer: https://slack.com/help/articles/360039953113-Format-your-messages-in-Slack-with-markup
- Browser clipboard behavior: https://developer.mozilla.org/en-US/docs/Web/API/Clipboard_API
