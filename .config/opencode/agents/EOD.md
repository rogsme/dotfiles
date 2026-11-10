---
description: Roger's EOD agent. Writes client EODs, internal updates and weekly recaps, and sets up clients, all through the eod skill. Does nothing else.
mode: primary
model: openai/gpt-6.1-sol
steps: 60
permissions:
  - { "action": "read", "resource": "*", "effect": "allow" }
  - { "action": "glob", "resource": "*", "effect": "allow" }
  - { "action": "grep", "resource": "*", "effect": "allow" }
  - { "action": "question", "resource": "*", "effect": "allow" }
  - { "action": "webfetch", "resource": "*", "effect": "deny" }
  - { "action": "websearch", "resource": "*", "effect": "deny" }
  - { "action": "edit", "resource": "*", "effect": "deny" }
  - { "action": "edit", "resource": "~/.eod/*", "effect": "allow" }
  - { "action": "edit", "resource": "~/.eod/*/*", "effect": "allow" }
  - { "action": "edit", "resource": "/tmp/opencode/*", "effect": "allow" }
  - { "action": "edit", "resource": "/tmp/eod-eval/*", "effect": "allow" }
  - { "action": "edit", "resource": "/tmp/eod-eval/*/*", "effect": "allow" }
  - { "action": "edit", "resource": "/tmp/eod-eval/*/*/*", "effect": "allow" }
  - { "action": "external_directory", "resource": "*", "effect": "deny" }
  - { "action": "external_directory", "resource": "~/.eod/*", "effect": "allow" }
  - { "action": "external_directory", "resource": "~/.eod/*/*", "effect": "allow" }
  - { "action": "external_directory", "resource": "~/.config/opencode/skills/eod/*", "effect": "allow" }
  - { "action": "external_directory", "resource": "~/.config/opencode/skills/eod/*/*", "effect": "allow" }
  - { "action": "external_directory", "resource": "~/.agents/skills/avoid-ai-tropes/*", "effect": "allow" }
  - { "action": "external_directory", "resource": "~/.agents/skills/chat-paste/*", "effect": "allow" }
  - { "action": "external_directory", "resource": "~/.claude/skills/chat-paste/*", "effect": "allow" }
  - { "action": "external_directory", "resource": "/tmp/opencode/*", "effect": "allow" }
  - { "action": "external_directory", "resource": "/tmp/eod-eval/*", "effect": "allow" }
  - { "action": "skill", "resource": "*", "effect": "deny" }
  - { "action": "skill", "resource": "eod", "effect": "allow" }
  - { "action": "skill", "resource": "chat-paste", "effect": "allow" }
  - { "action": "skill", "resource": "avoid-ai-tropes", "effect": "allow" }
  - { "action": "subagent", "resource": "*", "effect": "deny" }
  - { "action": "subagent", "resource": "eod-review", "effect": "allow" }
  - { "action": "subagent", "resource": "eod-reader", "effect": "allow" }
  # Ticket trackers are read-only (skills/eod/references/tickets.md): any Linear
  # MCP server's list, get and search tools, nothing that writes.
  - { "action": "linear*_*", "resource": "*", "effect": "deny" }
  - { "action": "linear*_list_*", "resource": "*", "effect": "allow" }
  - { "action": "linear*_get_*", "resource": "*", "effect": "allow" }
  - { "action": "linear*_search_*", "resource": "*", "effect": "allow" }
  # The RTK plugin rewrites gh, git log, ls and grep to `rtk <cmd>` before the
  # permission check, so those are listed in both forms.
  - { "action": "shell", "resource": "*", "effect": "deny" }
  - { "action": "shell", "resource": "date", "effect": "allow" }
  - { "action": "shell", "resource": "date *", "effect": "allow" }
  - { "action": "shell", "resource": "ls *", "effect": "allow" }
  - { "action": "shell", "resource": "rtk ls *", "effect": "allow" }
  - { "action": "shell", "resource": "grep *", "effect": "allow" }
  - { "action": "shell", "resource": "rtk grep *", "effect": "allow" }
  - { "action": "shell", "resource": "mkdir -p *", "effect": "allow" }
  - { "action": "shell", "resource": "git remote get-url*", "effect": "allow" }
  - { "action": "shell", "resource": "gh pr view *", "effect": "allow" }
  - { "action": "shell", "resource": "rtk gh pr view *", "effect": "allow" }
  - { "action": "shell", "resource": "gh pr list *", "effect": "allow" }
  - { "action": "shell", "resource": "rtk gh pr list *", "effect": "allow" }
  - { "action": "shell", "resource": "gh run list*", "effect": "allow" }
  - { "action": "shell", "resource": "rtk gh run list*", "effect": "allow" }
  - { "action": "shell", "resource": "gh workflow list *", "effect": "allow" }
  - { "action": "shell", "resource": "rtk gh workflow list *", "effect": "allow" }
  - { "action": "shell", "resource": "python3 ~/.config/opencode/skills/eod/scripts/eod_context.py", "effect": "allow" }
  - { "action": "shell", "resource": "python3 /home/roger/.config/opencode/skills/eod/scripts/eod_context.py", "effect": "allow" }
  - { "action": "shell", "resource": "python3 ~/.config/opencode/skills/eod/scripts/eod_context.py *", "effect": "allow" }
  - { "action": "shell", "resource": "python3 /home/roger/.config/opencode/skills/eod/scripts/eod_context.py *", "effect": "allow" }
  - { "action": "shell", "resource": "python3 ~/.config/opencode/skills/eod/scripts/todays_prs.py *", "effect": "allow" }
  - { "action": "shell", "resource": "python3 /home/roger/.config/opencode/skills/eod/scripts/todays_prs.py *", "effect": "allow" }
  - { "action": "shell", "resource": "python3 ~/.config/opencode/skills/eod/scripts/check_eod.py *", "effect": "allow" }
  - { "action": "shell", "resource": "python3 /home/roger/.config/opencode/skills/eod/scripts/check_eod.py *", "effect": "allow" }
  - { "action": "shell", "resource": "python3 ~/.config/opencode/skills/eod/scripts/render_eod.py *", "effect": "allow" }
  - { "action": "shell", "resource": "python3 /home/roger/.config/opencode/skills/eod/scripts/render_eod.py *", "effect": "allow" }
  - { "action": "shell", "resource": "python3 ~/.config/opencode/skills/eod/scripts/deployment_evidence.py *", "effect": "allow" }
  - { "action": "shell", "resource": "python3 /home/roger/.config/opencode/skills/eod/scripts/deployment_evidence.py *", "effect": "allow" }
  # Standalone chat-paste exports accept saved EODs or temporary messages.
  - { "action": "shell", "resource": "node /home/roger/.agents/skills/chat-paste/scripts/render_message.mjs --source /home/roger/.eod/*", "effect": "allow" }
  - { "action": "shell", "resource": "node /home/roger/.agents/skills/chat-paste/scripts/render_message.mjs --source ~/.eod/*", "effect": "allow" }
  - { "action": "shell", "resource": "node /home/roger/.agents/skills/chat-paste/scripts/render_message.mjs --source /tmp/opencode/*", "effect": "allow" }
  - { "action": "shell", "resource": "node ~/.agents/skills/chat-paste/scripts/render_message.mjs --source /home/roger/.eod/*", "effect": "allow" }
  - { "action": "shell", "resource": "node ~/.agents/skills/chat-paste/scripts/render_message.mjs --source ~/.eod/*", "effect": "allow" }
  - { "action": "shell", "resource": "node ~/.agents/skills/chat-paste/scripts/render_message.mjs --source /tmp/opencode/*", "effect": "allow" }
  - { "action": "shell", "resource": "node /home/roger/.claude/skills/chat-paste/scripts/render_message.mjs --source /home/roger/.eod/*", "effect": "allow" }
  - { "action": "shell", "resource": "node /home/roger/.claude/skills/chat-paste/scripts/render_message.mjs --source ~/.eod/*", "effect": "allow" }
  - { "action": "shell", "resource": "node /home/roger/.claude/skills/chat-paste/scripts/render_message.mjs --source /tmp/opencode/*", "effect": "allow" }
  - { "action": "shell", "resource": "node ~/.claude/skills/chat-paste/scripts/render_message.mjs --source /home/roger/.eod/*", "effect": "allow" }
  - { "action": "shell", "resource": "node ~/.claude/skills/chat-paste/scripts/render_message.mjs --source ~/.eod/*", "effect": "allow" }
  - { "action": "shell", "resource": "node ~/.claude/skills/chat-paste/scripts/render_message.mjs --source /tmp/opencode/*", "effect": "allow" }
  - { "action": "shell", "resource": "node /home/roger/.agents/skills/chat-paste/scripts/viewer.mjs open --session /tmp/opencode/*", "effect": "allow" }
  - { "action": "shell", "resource": "node /home/roger/.agents/skills/chat-paste/scripts/viewer.mjs poll --session /tmp/opencode/*", "effect": "allow" }
  - { "action": "shell", "resource": "node /home/roger/.agents/skills/chat-paste/scripts/viewer.mjs reply --session /tmp/opencode/*", "effect": "allow" }
  - { "action": "shell", "resource": "node /home/roger/.agents/skills/chat-paste/scripts/viewer.mjs end --session /tmp/opencode/*", "effect": "allow" }
  - { "action": "shell", "resource": "node ~/.agents/skills/chat-paste/scripts/viewer.mjs open --session /tmp/opencode/*", "effect": "allow" }
  - { "action": "shell", "resource": "node ~/.agents/skills/chat-paste/scripts/viewer.mjs poll --session /tmp/opencode/*", "effect": "allow" }
  - { "action": "shell", "resource": "node ~/.agents/skills/chat-paste/scripts/viewer.mjs reply --session /tmp/opencode/*", "effect": "allow" }
  - { "action": "shell", "resource": "node ~/.agents/skills/chat-paste/scripts/viewer.mjs end --session /tmp/opencode/*", "effect": "allow" }
  - { "action": "shell", "resource": "node /home/roger/.claude/skills/chat-paste/scripts/viewer.mjs open --session /tmp/opencode/*", "effect": "allow" }
  - { "action": "shell", "resource": "node /home/roger/.claude/skills/chat-paste/scripts/viewer.mjs poll --session /tmp/opencode/*", "effect": "allow" }
  - { "action": "shell", "resource": "node /home/roger/.claude/skills/chat-paste/scripts/viewer.mjs reply --session /tmp/opencode/*", "effect": "allow" }
  - { "action": "shell", "resource": "node /home/roger/.claude/skills/chat-paste/scripts/viewer.mjs end --session /tmp/opencode/*", "effect": "allow" }
  - { "action": "shell", "resource": "node ~/.claude/skills/chat-paste/scripts/viewer.mjs open --session /tmp/opencode/*", "effect": "allow" }
  - { "action": "shell", "resource": "node ~/.claude/skills/chat-paste/scripts/viewer.mjs poll --session /tmp/opencode/*", "effect": "allow" }
  - { "action": "shell", "resource": "node ~/.claude/skills/chat-paste/scripts/viewer.mjs reply --session /tmp/opencode/*", "effect": "allow" }
  - { "action": "shell", "resource": "node ~/.claude/skills/chat-paste/scripts/viewer.mjs end --session /tmp/opencode/*", "effect": "allow" }
  # Read-only window into the Obsidian vault. The agent never reads ~/obsidian
  # directly (external_directory denies it); this script filters per client.
  - { "action": "shell", "resource": "python3 ~/.config/opencode/skills/eod/scripts/obsidian_day.py *", "effect": "allow" }
  - { "action": "shell", "resource": "python3 /home/roger/.config/opencode/skills/eod/scripts/obsidian_day.py *", "effect": "allow" }
  # Style checker, on EOD drafts only. Loading a skill doesn't
  # let the agent run its scripts; that's a shell permission like any other.
  - { "action": "shell", "resource": "python3 /home/roger/.agents/skills/avoid-ai-tropes/scripts/check.py /home/roger/.eod/*", "effect": "allow" }
  - { "action": "shell", "resource": "python3 /home/roger/.agents/skills/avoid-ai-tropes/scripts/check.py ~/.eod/*", "effect": "allow" }
  - { "action": "shell", "resource": "python3 /home/roger/.agents/skills/avoid-ai-tropes/scripts/check.py /tmp/eod-eval/*", "effect": "allow" }
  - { "action": "shell", "resource": "python3 ~/.agents/skills/avoid-ai-tropes/scripts/check.py /home/roger/.eod/*", "effect": "allow" }
  - { "action": "shell", "resource": "python3 ~/.agents/skills/avoid-ai-tropes/scripts/check.py ~/.eod/*", "effect": "allow" }
  - { "action": "shell", "resource": "python3 ~/.agents/skills/avoid-ai-tropes/scripts/check.py /tmp/eod-eval/*", "effect": "allow" }
  - { "action": "shell", "resource": "python3 *", "effect": "allow" }
  - { "action": "shell", "resource": "bash -e -o pipefail -c 'python3 *'", "effect": "allow" }
  - { "action": "shell", "resource": "node *", "effect": "allow" }
  - { "action": "shell", "resource": "bash -e -o pipefail -c 'node *'", "effect": "allow" }
---

You are Roger's EOD agent. Load the `eod` skill and follow it. Roger's message is the skill's arguments; a message that is just a voice dump is a daily client EOD. The skill's files live in `~/.config/opencode/skills/eod/` (`<skill-dir>` in the skill).

Stay in your lane:
- For anything that isn't an EOD, an internal update, a weekly recap, or client setup, say in one line that this agent only does EODs and Roger should switch agents.
- The skill is read-only to you on purpose. When Roger wants it to work differently, tell him which file and what to change.
- Write with commas, colons, parentheses and periods, never em or en dashes, including in your notes to Roger.
