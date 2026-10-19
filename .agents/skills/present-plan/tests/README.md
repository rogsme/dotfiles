# Presenter verification

Tests use synthetic plans and disposable repositories outside this checkout. They never use a real tracker or forge. The renderer runtime is a separate private directory; Lavish runs through pinned `npx`, and no skill or Lavish package is installed into this checkout.

## Runtime

With explicit permission to install renderer test dependencies, use the Marked/Mermaid command in `references/lavish.md`. Set `PRESENT_PLAN_RUNTIME` to that runtime's absolute path. Do not install Lavish there: browser tests invoke it through pinned `npx`, which may download to npm's cache on first use. Offline execution needs that cached package. Set `TMPDIR` to an approved scratch directory when the default is not appropriate.

From the repository root:

```sh
node --test skills/engineering/present-plan/tests/*.test.mjs
```

The rendering tests need the prepared renderer and fail clearly when it is missing. They exercise the real pinned Markdown lexer. Diagram tests require a local classic bundle with no dynamic module imports, because ES modules fail CORS in Lavish's opaque-origin iframe. Protocol tests use disposable HTTP services and npx stubs, including a runtime with no local Lavish package. Their success does not prove real browser interaction. The CLI test runs both scripts through a symlink to the skill folder, the layout a symlinked install creates, and needs no renderer.

## Browser integration

With the same renderer runtime, `npx` and `playwright-cli` available:

```sh
node skills/engineering/present-plan/tests/browser.mjs
```

The integration test creates its own private state, free local port, scratch repository, review artifacts and named browser session. It opens no personal browser profile. It verifies rendered sections and safety, the Overview and Full plan tabs, blocks non-local browser requests, sends anchored feedback and a note on a diagram box through a real Lavish poll, checks live revision reload, and ends only its own sessions. Test-generated files stay in its scratch directory. A failed browser or missing dependency is a failure, never an inferred pass.

## Agent scenarios and human acceptance

`evals/evals.json` describes agent behavior; the unit tests do not certify it. Run the scenarios with and without the new skill in a disposable environment, using stubbed tracker/reviewer operations, and save transcripts outside the checkout. Check review-before-presentation ordering, complete failure fallback, stale feedback, and the separate approval/implementation boundary. Do not claim these scenarios passed from reading the prompts alone.

Then try one small and one architecture-heavy real plan on a configured project. Send an annotation, edit a diagram, request a substantive plan revision and verify the new adversarial round. End the browser review and confirm implementation still waits for explicit conversation approval and a separate work phase. This manual trial is not performed by the automated tests.
