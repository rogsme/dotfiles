# Clipboard implementation and validation

## Delivery paths

- Slack in Chromium: `slack/texty` Quill Delta, `text/html`, and `text/plain` in a copy event. Chromium packages the custom MIME so Slack Electron can read it as native rich text. Async Clipboard's `web slack/texty` is a different format and is not a substitute.
- Slack in Firefox/Zen and other non-Chromium browsers: `text/html` and `text/plain`, using the same semantic HTML model as Teams. This is a rich-HTML path, not a plain-text fallback. Firefox's custom-MIME packaging differs from Chromium's, so writing `slack/texty` there would not prove native Slack Electron compatibility. Keep these details here for diagnosis; the viewer omits protocol warnings.
- Teams: `text/html` and `text/plain`. The semantic HTML uses paragraphs, real lists, inline emphasis, safe links, quotes, and code. UI styling is not copied as a Slack or Teams theme.
- Plain-text button: an explicit unformatted choice, never an automatic fallback after a rich-copy failure.

One parsed message model produces the page's HTML, plain text, and Slack Delta. The renderer computes all three in Node and embeds them in the page; `assets/copy.js` writes them. List attributes belong on Delta newline operations. The formatter checks source indentation independently so a Markdown parser cannot silently turn child bullets into root bullets.

Heading styles come from explicit Markdown. Lines starting with the Unicode bullet (U+2022) are recognized as bullets. Common emoji shortcodes are converted to Unicode; unknown or workspace-specific names fail with a request to supply the Unicode emoji. Private-note removal and audience policy are caller responsibilities.

## Privacy and failure behavior

The viewer serves the page from this machine; the page loads nothing from another origin and has a restrictive Content Security Policy. Message files, comments and tokens live under the artifact root with owner-only permissions. Each link carries a token, and the Tailscale and Network links use plain HTTP, so share them only with the user. Source HTML and unsafe link protocols are rejected before anything is written. Do not publish client messages or put their contents into command-line arguments.

For copy failures, check a direct click on the button, browser clipboard permissions, and normal rich-text paste rather than paste-as-plain-text. Firefox/Zen is allowed to copy rich HTML; switching browsers is not the default fix. Automated tests inspect the actual selected format: HTML and plain text for rich HTML, plus Delta for Chromium's native Slack path. If clipboard data is intact but the destination differs, record the source and app/version and fix the destination conversion. Do not flatten lists to hide the problem.

## Test and maintenance paths

`tests/formatter.test.cjs` covers the formatter and `tests/copy.test.cjs` the copy buttons' routing and fail-closed behavior. `tests/browser.mjs` exercises real Chromium clipboard round-trips and the HTML path with a Firefox-like user agent, and `tests/firefox.cjs` tests the installed Firefox with its own headless profile. See `tests/README.md` for commands and destination acceptance.

The native Slack clipboard protocol is undocumented; retest after Slack updates. The vendored Marked parser is pinned at 18.1.0 with its MIT license in `assets/vendor/marked-LICENSE.md`. `scripts/vendor_marked.py` refreshes the pinned package only after SHA-512 verification. This is a maintainer action, not part of ordinary skill runs.

## Sources

- Workflow inspiration: https://github.com/davepoon/buildwithclaude/blob/main/plugins/all-skills/skills/slack-message-formatter/SKILL.md
- Native Slack clipboard format: https://github.com/cauethenorio/slackfmt/blob/main/packages/clipboard/README.md
- Browser copy-event implementation reference: https://github.com/cauethenorio/slackfmt/blob/main/packages/web/src/utils/clipboard.ts
- Markdown lexer: https://marked.js.org/using_pro
- Slack rich-text versus markup-only composer: https://slack.com/help/articles/360039953113-Format-your-messages-in-Slack-with-markup
- Browser clipboard behavior: https://developer.mozilla.org/en-US/docs/Web/API/Clipboard_API
