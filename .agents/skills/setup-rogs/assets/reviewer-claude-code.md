# Reviewer guide: Claude Code

Runs a Claude model as the plan reviewer through the `claude` CLI in print mode, for plans that a model from another vendor writes.

## Setup notes

Claude Code installed and signed in. Nothing else to configure: the command carries every limit as a flag.

## Command

```
claude -p --model <model id> --effort xhigh --restricted --tools "Read,Grep,Glob" --disallowedTools "Read(**/.env)" "Read(**/.env.*)" --strict-mcp-config --disable-slash-commands --no-session-persistence < <brief>
```

- `--restricted` with `--tools "Read,Grep,Glob"` leaves only the read tools and keeps them inside the working directory. It also skips the user, project and local settings files, so no hooks run.
- The two `Read(...)` rules keep environment files out of the review.
- `--strict-mcp-config`, with no `--mcp-config`, starts no MCP servers, so the reviewer cannot reach the tracker.
- `--disable-slash-commands` turns skills off, so the reviewer cannot start a review of its own.
- `--no-session-persistence` keeps the run out of the session list.
- The brief arrives on stdin, which ends with the file.
- The model is the strongest Claude model on the account, such as `claude-opus-5-5`.

## Check

`claude --help` lists `--restricted`, `--tools`, `--strict-mcp-config`, `--disable-slash-commands` and `--effort`. A CLI without them cannot run a read-only reviewer: keep the feature off until the user updates it.
