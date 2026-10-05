# Clipboard delivery

Clipboard export is optional. EOD drafting, checking, review, and plain-text delivery do not depend on another skill. When `chat-paste` is available, load it and hand off only the saved final update through the adapter below, not the assistant's whole response or raw notes.

## Generate

Run one command, substituting the mode and the actual saved draft path:

```text
python3 <skill-dir>/scripts/render_eod.py ~/.eod/<client>/<draft>.md --mode client --client ~/.eod/<client>/client.md
```

Modes: `client` for daily, `internal` for `<today>-internal.md`, `weekly` for `<today>-weekly.md`. Keep test/eval filenames and log-root overrides when applicable. The adapter removes private annotations and prepares explicit Markdown headings, then sends that message through the formatter's public CLI using standard input and an output path. It never imports formatter modules or edits the draft or client configuration. EOD preparation needs only Python 3; clipboard export additionally uses the formatter's runtime requirements.

The optional formatter owns browser opening and delivery preferences. The adapter forwards `--no-open` when the request or evaluation forbids application launches; otherwise it leaves the formatter's default alone. Include a URL only when the formatter printed a successfully generated preview. Report automatic-opening failures and return that URL.

If the formatter is absent, the adapter prints that clipboard export was skipped and returns exit code 0. Continue checked plain-text delivery; do not present an old HTML file as a fresh preview. When installed, exit code 0 plus a printed preview path means export succeeded. A formatter failure is reported separately from the valid EOD draft; fix unsupported structure without changing meaning, rerun the writing checker, and retry, or report the export error while delivering the checked plain text.

## EOD policy

The adapter removes `## Internal notes` and everything below it before the handoff. It rejects review labels and reminders accidentally saved in the public body. All EOD-specific privacy and content preparation stays here; the formatter receives only a finished message.

The adapter turns ALL CAPS EOD headers and weekly theme headings into explicit Markdown headings for the shared renderer, without changing the saved log. Weekly themes follow the existing shape: a short standalone line followed immediately by its paragraph or list. The browser source shows this prepared Markdown; the saved EOD keeps its plain-text writing rules.

Regenerate after revisions. Browser edits are temporary and have not passed the writing checker; direct EOD revisions back through the agent. The generic editor does not remove private content that Roger manually pastes into it. Keep raw notes and private annotations out of that editor.

When using the optional formatter, follow its public instructions for clipboard behavior and delivery. A successful export proves generation, not perfect rendering in Slack or Ferdium. EOD tests cover preparation, the CLI handoff, and standalone delivery without a formatter.
