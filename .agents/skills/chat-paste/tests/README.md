# Chat-paste tests

Tests need Node.js 22+ and use synthetic messages. They never open Slack, Teams or Ferdium, and they create their own artifact roots and free ports, so they never touch a message the user has open.

## Automated checks

From the repository root:

```sh
node --test skills/writing/chat-paste/tests/*.test.cjs skills/writing/chat-paste/tests/*.test.mjs
```

The formatter and copy tests run the formatter and the copy buttons without a browser: routing for Chromium, Firefox-like and unknown browsers, and failures that never fall back to plain text. The render tests cover formatting into a session, escaping, failures that write nothing, revisions, and a run from a copied skill folder. The server tests run the viewer in-process on a free loopback port: tokens and cookies, asset and route limits, the file channel from page to poll, general comments, reply validation, the Done guards, stale comments, theme memory, the end of an abandoned message, idle shutdown, the refusal to stop another viewer or service, and the move to the next port. The CLI test runs every script through a symlink to the skill folder. `viewer-copies.test.mjs` checks that `assets/attention.js` and `assets/changes.js` still match present-plan's, and skips outside this repository.

## Browser integration

With `playwright-cli` available:

```sh
node skills/writing/chat-paste/tests/browser.mjs
```

It renders `demo.md`, opens it on its own server and named browser session, and checks that only the viewer is contacted. It copies for Slack, Teams and plain text and pastes each into another tab to inspect the real clipboard, including Slack's native Delta, checks a failed copy, and repeats the Slack copy with a Firefox-like user agent. Then it comments on a word, a selected range and the whole message, sends the batch, polls it, answers it and renders revision 2. It checks the live reload, the `(new)` title mark, the change marks and their toggle, the answers, a copy of revision 2, and Done. A failed browser or missing dependency is a failure, never an inferred pass.

To test real Firefox, with the installed `firefox` binary (or `FIREFOX_BINARY`):

```sh
node skills/writing/chat-paste/tests/firefox.cjs
```

It uses WebDriver BiDi with a fresh headless profile in the system temp directory, starts its own viewer, and checks real Firefox copy and paste across tabs and theme memory. It never reads the user's browser profile.

## Destination acceptance

Open a real message in your normal browser, including Firefox/Zen, and test both copy buttons in private Slack and Teams/Ferdium destinations. Chromium supplies native Slack rich text; Firefox/Zen supplies semantic HTML. A successful HTML clipboard check does not prove that Slack interprets every feature the same way as its native format. Check the composer and, with approval, a final private test message:

- Intended heading emphasis and all paragraph/blank-line breaks match.
- Native lists preserve both child and grandchild nesting.
- Words, punctuation, emoji, link labels, and link targets match.
- Plain ALL CAPS text remains plain unless explicitly marked as a heading.
- A supplied "Internal notes" section remains present.

Record the source and app/version for any destination mismatch and fix the conversion. Real mentions need selecting in the destination app. Fonts and app-controlled visual spacing are not copied from the page's stylesheet.
