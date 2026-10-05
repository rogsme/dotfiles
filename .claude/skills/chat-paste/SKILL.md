---
name: chat-paste
description: Make messages copy-paste ready for Slack or Microsoft Teams with a local HTML preview and rich-text clipboard buttons. Use for requests such as "make this Slack/Teams pastable", "format this for Slack", "Teams-ready copy", or when another workflow needs formatted chat delivery. Preserve the message's wording; this skill formats content and does not send it.
compatibility: Python 3, Node.js 20+, Chromium for native Slack clipboard; shared by Claude Code and OpenCode.
---

# Chat paste

Turn a message into a self-contained browser page with **Copy for Slack** and **Copy for Teams** buttons. The page keeps content local. Slack uses its native rich-text clipboard format; Teams uses semantic HTML.

`<skill-dir>` is the directory containing this file, normally `~/.claude/skills/chat-paste`.

## Workflow

1. Resolve the message and destination. Use the supplied text or file, or the message already drafted in the conversation. Preserve its wording and intended structure. Ask for the message if none is available. Choose `slack`, `teams`, or `both`; use `both` if the request names both apps or leaves the destination open.
2. Prepare only the content the user intends to paste. Keep commentary outside it. Preserve existing Markdown; encode intended headings, emphasis, and links explicitly in Markdown when needed. Plain ALL CAPS lines remain plain unless the caller marks them as headings. For writing a new message, follow the applicable writing skills before formatting it.
3. Save the message to a UTF-8 text or Markdown file if it is not already in one. Use a user-approved output location, or a unique temporary file under `/tmp/opencode` in OpenCode. Keep message content out of command arguments. Run:

   ```text
   python3 <skill-dir>/scripts/render_message.py <message-file> --destination both
   ```

   Substitute the destination. Output defaults to a matching `.html` beside the input. Use `--output <page.html>` to choose another path. The input is never edited. Existing unrelated HTML files and symlinks are preserved. Runtime is offline; no npm install is needed.
4. Require exit code 0 and the printed preview path. If formatting is unsupported, explain the specific blocker and preserve the source; do not silently flatten lists, remove unsupported content, or present plain text as a successful rich export. Read `references/clipboard.md` when diagnosing a copy or formatting issue.
5. The shared exporter opens the finished preview in the default browser automatically. This applies to standalone use and workflow adapters such as EOD. Pass `--no-open` only when the user asks not to open a browser or an evaluation forbids application launches. Return the printed `file://` URL and absolute path, the recommended copy button, and any relevant formatting notes. If opening fails, report that failure and return the URL. Tell the user to copy and paste normally into the destination's rich-text editor. Keep browser-protocol details out of normal delivery. The skill does not post messages or automatically replace the user's clipboard.

After revisions, regenerate from the updated source; the exporter opens the updated preview. Edits made in the browser are temporary and are not written back to the source file. The page has a light/dark toggle that remembers the choice in browser storage; only the theme is stored.

## Other workflows calling this skill

The caller owns audience policy, review, private-note exclusion, and any inferred heading styles. This formatter deliberately preserves sections named "Internal notes" and text such as "Before you send:" when they are part of the supplied message. It cannot decide whether those words are private annotations or legitimate content.

For the EOD workflow, use its `scripts/render_eod.py` adapter after the writing checker passes. That adapter removes private annotations and prepares EOD headings before calling this skill's renderer. Keep the EOD's saved plain-text format unchanged. Do not run the generic renderer directly against a raw EOD log or notes file.

Other callers can use the CLI above, or import `scripts/render_message.py`: `render(text, title, destination)` returns the HTML page and formatting notes, `write_preview(page, output)` saves it safely, and `describe_preview(output, destination, warnings)` delivers and opens it. CLI adapters use `add_browser_arguments(parser)` to inherit the default opening behavior and `--no-open` opt-out. Keep client-specific rules in the caller rather than adding them here.

## Formatting acceptance

Supported: paragraphs and blank lines, explicit Markdown headings rendered as bold lines, nested lists, emphasis, safe links, Unicode emoji and common shortcodes, simple quotes, and code.

Unsupported constructs fail explicitly. These include tables, images, raw HTML, checkbox tasks, ambiguous list indentation, multiline or multiparagraph bullet items, and non-1 numbered-list starts. Keep each bullet on one source line and let the app wrap it visually.

Real `@mentions` must be selected in the destination app. Copied names are ordinary text and do not notify anyone. Use Slack's normal rich-text composer, not its markup-only preference. Firefox/Zen copies semantic HTML; Chromium copies that plus Slack's native format. For Teams, use the expanded formatting editor, including inside Ferdium. See `references/clipboard.md` for protocol details when diagnosing a problem.

Clipboard verification lives in automated tests, not the user interface. Never claim that app rendering is verified from a preview or unit tests alone. Roger accepted the Firefox/Zen-to-Slack path with his Madison and Wall EOD on 2026-10-05. If a new formatting issue appears, reproduce it against the actual destination rather than repeating protocol warnings on every preview. Sending a test message requires the user's approval.
