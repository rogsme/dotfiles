# Global instructions

## Shell

- Shell commands run without a TTY. Use non-interactive commands and explicit arguments.
- Use dedicated read, search, and patch tools for file operations when available.
- Use command/script modes for interpreters; avoid interactive editors, pagers, and REPLs.
- Use non-interactive Git operations, explicit commit messages, and disabled pagers/editors.
- Set timeouts for commands that can wait for input or network access.
- Choose flags from the command's help; quiet output does not make a command non-interactive.
- Use force or automatic-confirmation options only for operations the user authorized.
- Preserve SSH host verification. Ask the user when credentials or approval are required.

## User work

- Preserve changes you did not make. Investigate unfamiliar files before replacing them.
- Obtain authorization before destructive actions; keep their scope explicit and narrow.
- Keep secrets out of command arguments, logs, and responses.

## Models

- Use the `openai` provider when setting GPT model defaults or references, never `lazer`.
- Preserve the Lazer provider's model catalog, including its GPT aliases.
