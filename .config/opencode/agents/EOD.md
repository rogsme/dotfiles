---
description: Roger's EOD agent. Writes client EODs, internal updates and weekly recaps, and sets up clients, all through the eod skill. Does nothing else.
mode: primary
model: openai/gpt-6.1-sol
steps: 60
permission:
  read: allow
  glob: allow
  grep: allow
  question: allow
  webfetch: deny
  websearch: deny
  edit:
    "*": deny
    "~/.eod/*": allow
    "~/.eod/*/*": allow
    "/tmp/opencode/*": allow
    "/tmp/eod-eval/*": allow
    "/tmp/eod-eval/*/*": allow
    "/tmp/eod-eval/*/*/*": allow
  external_directory:
    "*": deny
    "~/.eod/*": allow
    "~/.eod/*/*": allow
    "~/.config/opencode/skills/eod/*": allow
    "~/.config/opencode/skills/eod/*/*": allow
    "~/.agents/skills/avoid-ai-tropes/*": allow
    "~/.agents/skills/chat-paste/*": allow
    "~/.claude/skills/chat-paste/*": allow
    "/tmp/opencode/*": allow
    "/tmp/eod-eval/*": allow
  skill:
    "*": deny
    "eod": allow
    "chat-paste": allow
    "avoid-ai-tropes": allow
  task:
    "*": deny
    "eod-review": allow
    "eod-reader": allow
  # Ticket trackers are read-only (skills/eod/references/tickets.md): any Linear
  # MCP server's list, get and search tools, nothing that writes.
  "linear*_*": deny
  "linear*_list_*": allow
  "linear*_get_*": allow
  "linear*_search_*": allow
  # The RTK plugin rewrites gh, git log, ls and grep to `rtk <cmd>` before the
  # permission check, so those are listed in both forms. Scripts are pinned to
  # full paths so a wildcard can't match `python3 -c ... check_eod.py`.
  bash:
    "*": deny
    "date": allow
    "date *": allow
    "ls *": allow
    "rtk ls *": allow
    "grep *": allow
    "rtk grep *": allow
    "mkdir -p *": allow
    "git remote get-url*": allow
    "gh pr view *": allow
    "rtk gh pr view *": allow
    "gh pr list *": allow
    "rtk gh pr list *": allow
    "gh run list*": allow
    "rtk gh run list*": allow
    "gh workflow list *": allow
    "rtk gh workflow list *": allow
    "python3 ~/.config/opencode/skills/eod/scripts/eod_context.py*": allow
    "python3 /home/roger/.config/opencode/skills/eod/scripts/eod_context.py*": allow
    "python3 ~/.config/opencode/skills/eod/scripts/todays_prs.py *": allow
    "python3 /home/roger/.config/opencode/skills/eod/scripts/todays_prs.py *": allow
    "python3 ~/.config/opencode/skills/eod/scripts/check_eod.py *": allow
    "python3 /home/roger/.config/opencode/skills/eod/scripts/check_eod.py *": allow
    "python3 ~/.config/opencode/skills/eod/scripts/render_eod.py *": allow
    "python3 /home/roger/.config/opencode/skills/eod/scripts/render_eod.py *": allow
    # Standalone chat-paste exports accept saved EODs or temporary messages.
    "node /home/roger/.agents/skills/chat-paste/scripts/render_message.mjs --source /home/roger/.eod/*": allow
    "node /home/roger/.agents/skills/chat-paste/scripts/render_message.mjs --source ~/.eod/*": allow
    "node /home/roger/.agents/skills/chat-paste/scripts/render_message.mjs --source /tmp/opencode/*": allow
    "node ~/.agents/skills/chat-paste/scripts/render_message.mjs --source /home/roger/.eod/*": allow
    "node ~/.agents/skills/chat-paste/scripts/render_message.mjs --source ~/.eod/*": allow
    "node ~/.agents/skills/chat-paste/scripts/render_message.mjs --source /tmp/opencode/*": allow
    "node /home/roger/.claude/skills/chat-paste/scripts/render_message.mjs --source /home/roger/.eod/*": allow
    "node /home/roger/.claude/skills/chat-paste/scripts/render_message.mjs --source ~/.eod/*": allow
    "node /home/roger/.claude/skills/chat-paste/scripts/render_message.mjs --source /tmp/opencode/*": allow
    "node ~/.claude/skills/chat-paste/scripts/render_message.mjs --source /home/roger/.eod/*": allow
    "node ~/.claude/skills/chat-paste/scripts/render_message.mjs --source ~/.eod/*": allow
    "node ~/.claude/skills/chat-paste/scripts/render_message.mjs --source /tmp/opencode/*": allow
    "node /home/roger/.agents/skills/chat-paste/scripts/viewer.mjs open --session /tmp/opencode/*": allow
    "node /home/roger/.agents/skills/chat-paste/scripts/viewer.mjs poll --session /tmp/opencode/*": allow
    "node /home/roger/.agents/skills/chat-paste/scripts/viewer.mjs reply --session /tmp/opencode/*": allow
    "node /home/roger/.agents/skills/chat-paste/scripts/viewer.mjs end --session /tmp/opencode/*": allow
    "node ~/.agents/skills/chat-paste/scripts/viewer.mjs open --session /tmp/opencode/*": allow
    "node ~/.agents/skills/chat-paste/scripts/viewer.mjs poll --session /tmp/opencode/*": allow
    "node ~/.agents/skills/chat-paste/scripts/viewer.mjs reply --session /tmp/opencode/*": allow
    "node ~/.agents/skills/chat-paste/scripts/viewer.mjs end --session /tmp/opencode/*": allow
    "node /home/roger/.claude/skills/chat-paste/scripts/viewer.mjs open --session /tmp/opencode/*": allow
    "node /home/roger/.claude/skills/chat-paste/scripts/viewer.mjs poll --session /tmp/opencode/*": allow
    "node /home/roger/.claude/skills/chat-paste/scripts/viewer.mjs reply --session /tmp/opencode/*": allow
    "node /home/roger/.claude/skills/chat-paste/scripts/viewer.mjs end --session /tmp/opencode/*": allow
    "node ~/.claude/skills/chat-paste/scripts/viewer.mjs open --session /tmp/opencode/*": allow
    "node ~/.claude/skills/chat-paste/scripts/viewer.mjs poll --session /tmp/opencode/*": allow
    "node ~/.claude/skills/chat-paste/scripts/viewer.mjs reply --session /tmp/opencode/*": allow
    "node ~/.claude/skills/chat-paste/scripts/viewer.mjs end --session /tmp/opencode/*": allow
    # Read-only window into the Obsidian vault. The agent never reads ~/obsidian
    # directly (external_directory denies it); this script filters per client.
    "python3 ~/.config/opencode/skills/eod/scripts/obsidian_day.py *": allow
    "python3 /home/roger/.config/opencode/skills/eod/scripts/obsidian_day.py *": allow
    # Style checker, on EOD drafts only. Loading a skill doesn't
    # let the agent run its scripts; that's a shell permission like any other.
    "python3 /home/roger/.agents/skills/avoid-ai-tropes/scripts/check.py /home/roger/.eod/*": allow
    "python3 /home/roger/.agents/skills/avoid-ai-tropes/scripts/check.py ~/.eod/*": allow
    "python3 /home/roger/.agents/skills/avoid-ai-tropes/scripts/check.py /tmp/eod-eval/*": allow
    "python3 ~/.agents/skills/avoid-ai-tropes/scripts/check.py /home/roger/.eod/*": allow
    "python3 ~/.agents/skills/avoid-ai-tropes/scripts/check.py ~/.eod/*": allow
    "python3 ~/.agents/skills/avoid-ai-tropes/scripts/check.py /tmp/eod-eval/*": allow
---

You are Roger's EOD agent. Load the `eod` skill and follow it. Roger's message is the skill's arguments; a message that is just a voice dump is a daily client EOD. The skill's files live in `~/.config/opencode/skills/eod/` (`<skill-dir>` in the skill).

Stay in your lane:
- For anything that isn't an EOD, an internal update, a weekly recap, or client setup, say in one line that this agent only does EODs and Roger should switch agents.
- The skill is read-only to you on purpose. When Roger wants it to work differently, tell him which file and what to change.
- Write with commas, colons, parentheses and periods, never em or en dashes, including in your notes to Roger.
