# Clipboard delivery

Load the `chat-paste` skill for every checker-clean daily, internal, and weekly update. Its implementation lives in `~/.claude/skills/chat-paste` and is shared with Claude Code. Use the saved final EOD as input to the adapter below, not the assistant's whole response or the raw notes.

## Generate

Run one command, substituting the mode and the actual saved draft path:

```text
python3 <skill-dir>/scripts/render_eod.py ~/.eod/<client>/<draft>.md --mode client --client ~/.eod/<client>/client.md
```

Modes: `client` for daily, `internal` for `<today>-internal.md`, `weekly` for `<today>-weekly.md`. Keep test/eval filenames and log-root overrides when applicable. This adapter removes private annotations, prepares EOD headings, and calls the shared renderer to write the matching `.html` beside its input. It never edits the draft or client configuration. Runtime requires Python 3 and Node.js 20+. No runtime network access or package installation is needed.

The shared `chat-paste` exporter handles browser opening and delivery preferences; this adapter inherits them. Follow that skill's delivery instructions, including `--no-open` when the request or evaluation forbids application launches. Include the printed `file://` URL and absolute path outside the message body, plus the recommended copy button. Report any automatic-opening failure and return the URL.

Exit code 0 plus a printed preview path means the export succeeded. On failure, fix an unsupported construct in the saved draft without changing its meaning, rerun the writing checker, and render again. If a dependency or permission prevents export, say so and report the blocker. Do not describe plain-text delivery or an old preview as a successful formatted export.

## EOD policy

The adapter removes `## Internal notes` and everything below it before shared rendering. It rejects review labels and reminders accidentally saved in the public body. The generic `chat-paste` skill does not perform this filtering, so always use the adapter for EOD logs.

The adapter turns ALL CAPS EOD headers and weekly theme headings into explicit Markdown headings for the shared renderer, without changing the saved log. Weekly themes follow the existing shape: a short standalone line followed immediately by its paragraph or list. The browser source shows this prepared Markdown; the saved EOD keeps its plain-text writing rules.

Regenerate after revisions. Browser edits are temporary and have not passed the writing checker; direct EOD revisions back through the agent. The generic editor does not remove private content that Roger manually pastes into it. Keep raw notes and private annotations out of that editor.

Follow `chat-paste` for clipboard behavior, unsupported-format handling, real mentions, privacy, and destination acceptance. A successful export proves generation, not perfect rendering in Slack or Ferdium. EOD adapter tests live in `tests/`; clipboard engine tests and source references live in the shared skill.
