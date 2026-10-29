# EOD integration maintenance

The EOD agent remains read-only toward its own configuration, client repositories and trackers. Make repairs from a maintenance/build session; don't widen the EOD agent to edit its own rules.

From `~/.config/opencode`, run:

* `bun run check:eod`: strict installed-formatter probe and all deterministic regression tests. A broken or missing required formatter fails before optional integration tests can silently skip.
* `bun run check:eod:agent`: the same checks plus a synthetic `opencode run --standalone --agent EOD` run under the actual installed permissions. This makes a model call. It uses temporary synthetic Markdown, opens no browser, reads no client logs, and verifies a completed renderer tool call plus the public-only output.

Run the strict check after EOD or chat-paste updates; run the actual-agent check after command, permission or entry-point changes. A passing regex-based permission test alone does not prove the live agent can execute the command.

Normal EOD startup probes the installed formatter every time. It also fingerprints the EOD code, tests, instructions, agent definitions and formatter files, and runs the regression suite after a change. Passing fingerprints and synthetic test logs live under `/tmp/opencode/eod-install-checks/`; a failed run never gets a passing cache entry. Installed-but-incompatible is `BROKEN`, while a genuinely absent optional skill is `ABSENT`. The synthetic render uses a private temporary directory and is removed afterward. Successful prose checks never imply rich clipboard delivery was generated or opened.

The actual-agent smoke retains its synthetic transcript and artifacts under the printed `/tmp/opencode/eod-agent-smoke-*` path. On failure, inspect those files. Keep permission denials distinct from missing programs and incompatible interfaces; don't retry a denied operation through another tool.
