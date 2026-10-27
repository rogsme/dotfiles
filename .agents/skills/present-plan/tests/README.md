# Presenter verification

Tests use synthetic plans and disposable repositories outside this checkout. They never use a real tracker or forge. They need Node.js 22+ and network access to `cdn.jsdelivr.net` for the first Marked fetch, which they cache in `$TMPDIR/present-plan-test-cache`. Set `TMPDIR` to an approved scratch directory when the default is not appropriate.

From the repository root:

```sh
node --test skills/engineering/present-plan/tests/*.test.mjs
```

The render tests exercise the real pinned Markdown lexer, the safety rules, tabs, badges, CDN pins, diagram digests and session revisions. The server tests run the viewer in-process on a free loopback port: tokens and cookies, asset and route limits, the file channel from page to poll, general comments, reply validation, the Approve and Done guards, stale comments, theme memory across reviews, idle shutdown, the refusal to stop another viewer or service, and the move to the next port when the configured one is held. The changes test runs the page's block alignment and word diff, and the attention test the page's decision on when to mark the title or notify, without a browser. The CLI test runs every script through a symlink to the skill folder, the layout a symlinked install creates. None of these prove real browser interaction.

## Browser integration

With `playwright-cli` available:

```sh
node skills/engineering/present-plan/tests/browser.mjs
```

The integration test creates its own artifact root, free port, scratch repository and named browser session, and opens no personal browser profile. It renders two reviews on one server and checks that only the viewer and the CDN are contacted. It checks the rendered sections and safety, the Overview and Full plan tabs, that comment mode is off by default, and that the notification bell shows only where the browser can still ask. It switches to dark mode, then comments on a word, a diagram box, a whole diagram and a selected range, adds a general comment from the panel, and sends the batch. It polls the batch, answers it, and renders revision 2, then checks the live reload with the answers, the changes marked since revision 1 and their toggle across reloads, the `(new)` title mark on a tab without focus until it gets focus, and that the second review opens in the saved theme. Finally it approves through the confirmation dialog and polls the approval. It stops its own server at the end. A failed browser or missing dependency is a failure, never an inferred pass.

## Agent scenarios and human acceptance

`evals/evals.json` describes agent behavior; the unit tests do not certify it. Run the scenarios with and without the new skill in a disposable environment, using stubbed tracker/reviewer operations, and save transcripts outside the checkout. Check review-before-presentation ordering, complete failure fallback, stale feedback, and that only an approval matching the current revision and digest counts. Do not claim these scenarios passed from reading the prompts alone.

Then try one small and one architecture-heavy real plan on a configured project, from this machine and from another one on the network. Comment on text, a word, a box and a diagram, request a substantive plan revision and verify the new adversarial round, then approve and confirm the agent starts work-ticket on that exact revision. This manual trial is not performed by the automated tests.
