# Clipboard delivery

Generate a local HTML preview for every checker-clean daily, internal, and weekly update. Use the saved final message as input, not the assistant's whole response or the raw notes.

## Generate

Run one command, substituting the mode and the actual saved draft path:

```text
python3 <skill-dir>/scripts/render_eod.py ~/.eod/<client>/<draft>.md --mode client --client ~/.eod/<client>/client.md
```

Modes: `client` for daily, `internal` for `<today>-internal.md`, `weekly` for `<today>-weekly.md`. Keep test/eval filenames and log-root overrides when applicable. The renderer writes the matching `.html` beside its input; it never edits the draft or client configuration. Runtime requires Python 3 and Node.js 20+. All browser assets are bundled in the skill and embedded in the output. No runtime network access or package installation is needed.

After a successful render, include the printed `file://` link and absolute path outside the paste-ready text. Tell Roger to open it in Chromium and click the recommended button, then paste with Ctrl+V. After a revision, tell him to reload an already-open preview so it shows the regenerated draft. Add `--open` only when Roger asks you to open the page; otherwise return the link without launching an application.

Exit code 0 plus a printed preview path means the export succeeded. On failure, fix an unsupported construct in the saved draft without changing its meaning, rerun the writing checker, and render again. If a dependency or permission prevents export, say so and report the blocker. Do not describe plain-text delivery or an old preview as a successful formatted export.

## What gets copied

- Slack desktop on Linux: native `slack/texty` Quill Delta plus rich HTML and plain text. Copying uses Chromium's copy event so its custom clipboard data crosses into Slack Electron.
- Teams in Ferdium on Linux: semantic rich HTML plus plain text. Use Teams' expanded formatting editor and normal Ctrl+V.
- Plain-text button: an explicit, unformatted alternative, never an automatic fallback.

The renderer turns ALL CAPS EOD headers and weekly theme headings into bold lines, converts both `*` and `•` bullets to real lists, preserves nesting and blank lines, and handles inline emphasis, links, quotes, and code. Weekly theme headings follow the existing shape: a short standalone line followed immediately by its paragraph or list. Other headings can be specified explicitly in the browser's Markdown mode. Saved EODs still follow the skill's plain-text writing rules.

Standard emoji used by internal updates are converted to Unicode. For an unsupported shortcode, replace it with its Unicode emoji; workspace custom emoji cannot be resolved offline. A copied `@name` is ordinary text: tell Roger to select the actual mention in the destination app if a notification is needed. The page shows this note too.

The export removes `## Internal notes` and everything below it before embedding any text. Review flags and reminders remain in the chat response only. Inputs containing them are rejected. Treat the generated HTML as private client material; it is written with owner-only permissions. Do not publish or upload it.

## Formatting gate

Unsupported tables, images, raw HTML, task checkboxes, non-1 ordered-list starts, multiline bullet items, and multiparagraph bullet items fail explicitly. Nothing is silently flattened or discarded. Keep an EOD bullet on one source line; the destination wraps it visually. A blank line inside a nested list is rejected rather than breaking its hierarchy.

After every revision, regenerate the page from the updated checker-clean file. Browser edits are temporary, do not update the log, and have not passed the writing checker; direct EOD revisions back through the agent.

The page's optional clipboard verification checks that the copied text, Slack Delta, and HTML structure match its preview. It does not certify the destination app's rendering. For the first acceptance run, check daily, internal, and weekly examples in Roger's installed Slack and Teams/Ferdium, including nested bullets, section breaks, emphasis, links, and emoji. Check the final rendered message in a private test destination with Roger's approval. Require every intended structure and formatting feature to match before calling destination compatibility verified. Never claim perfect app rendering based only on the local preview or unit tests.

## Sources and maintenance

- Original workflow inspiration: https://github.com/davepoon/buildwithclaude/blob/main/plugins/all-skills/skills/slack-message-formatter/SKILL.md
- Native Slack clipboard protocol and browser copy-event example: https://github.com/cauethenorio/slackfmt/blob/main/packages/web/src/utils/clipboard.ts and https://github.com/cauethenorio/slackfmt/blob/main/packages/clipboard/README.md
- Marked lexer: https://marked.js.org/using_pro and the vendored MIT license at `assets/vendor/marked-LICENSE.md`.
- Slack rich-text versus markup-only composer: https://slack.com/help/articles/360039953113-Format-your-messages-in-Slack-with-markup

The formatter is purpose-built here; it does not install or invoke the source skill. Slack's native clipboard format is undocumented, so retest after Slack updates. `scripts/vendor_marked.py` refreshes the pinned parser after verifying the package's SHA-512; this is a maintainer action, not part of EOD runs.
