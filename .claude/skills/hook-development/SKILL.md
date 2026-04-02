---
name: hook-development
description: This skill should be used when the user asks to "create a hook", "add a PreToolUse/PostToolUse/Stop hook", "validate tool use", "implement prompt-based hooks", "use ${CLAUDE_PLUGIN_ROOT}", "set up event-driven automation", "block dangerous commands", or mentions hook events (PreToolUse, PostToolUse, Stop, SubagentStop, SessionStart, SessionEnd, UserPromptSubmit, PreCompact, Notification). Provides comprehensive guidance for creating and implementing Claude Code plugin hooks with focus on advanced prompt-based hooks API.
version: 0.2.0
---

# Hook Development for Claude Code Plugins

## Overview

Hooks are event-driven automation scripts that execute in response to Claude Code events. Use hooks to validate operations, enforce policies, add context, and integrate external tools into workflows.

**Key capabilities:**
- Validate tool calls before execution (PreToolUse)
- React to tool results (PostToolUse)
- Enforce completion standards (Stop, SubagentStop)
- Load project context (SessionStart)
- Automate workflows across the development lifecycle

## Hook Types

### Prompt-Based Hooks (Recommended)

Use LLM-driven decision making for context-aware validation:

```json
{
  "type": "prompt",
  "prompt": "Evaluate if this tool use is appropriate: $TOOL_INPUT",
  "timeout": 30
}
```

**Supported events:** Stop, SubagentStop, UserPromptSubmit, PreToolUse

**Benefits:**
- Context-aware decisions based on natural language reasoning
- Flexible evaluation logic without bash scripting
- Better edge case handling
- Easier to maintain and extend

### Command Hooks

Execute bash commands for deterministic checks:

```json
{
  "type": "command",
  "command": "bash ${CLAUDE_PLUGIN_ROOT}/scripts/validate.sh",
  "timeout": 60
}
```

**Use for:**
- Fast deterministic validations
- File system operations
- External tool integrations
- Performance-critical checks

## Hook Configuration Formats

### Plugin hooks.json Format

**For plugin hooks** in `hooks/hooks.json`, use wrapper format:

```json
{
  "description": "Brief explanation of hooks (optional)",
  "hooks": {
    "PreToolUse": [...],
    "Stop": [...],
    "SessionStart": [...]
  }
}
```

**Key points:**
- `description` field is optional
- `hooks` field is required wrapper containing actual hook events
- This is the **plugin-specific format**

**Example:**
```json
{
  "description": "Validation hooks for code quality",
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Write",
        "hooks": [
          {
            "type": "command",
            "command": "${CLAUDE_PLUGIN_ROOT}/hooks/validate.sh"
          }
        ]
      }
    ]
  }
}
```

### Settings Format (Direct)

**For user settings** in `.claude/settings.json`, use direct format:

```json
{
  "PreToolUse": [...],
  "Stop": [...],
  "SessionStart": [...]
}
```

**Key points:**
- No wrapper - events directly at top level
- No description field
- This is the **settings format**

**Important:** The examples in reference files show the hook event structure that goes inside either format. For plugin hooks.json, wrap these in `{"hooks": {...}}`.

## Hook Events Quick Reference

| Event | When | Use For |
|-------|------|---------|
| PreToolUse | Before tool | Validation, modification |
| PostToolUse | After tool | Feedback, logging |
| UserPromptSubmit | User input | Context, validation |
| Stop | Agent stopping | Completeness check |
| SubagentStop | Subagent done | Task validation |
| SessionStart | Session begins | Context loading |
| SessionEnd | Session ends | Cleanup, logging |
| PreCompact | Before compact | Preserve context |
| Notification | User notified | Logging, reactions |

Read `references/hook-events.md` for detailed event documentation, JSON examples, input/output formats, and exit codes.

## Environment Variables

Available in all command hooks:

- `$CLAUDE_PROJECT_DIR` - Project root path
- `$CLAUDE_PLUGIN_ROOT` - Plugin directory (use for portable paths)
- `$CLAUDE_ENV_FILE` - SessionStart only: persist env vars here
- `$CLAUDE_CODE_REMOTE` - Set if running in remote context

**Always use ${CLAUDE_PLUGIN_ROOT} in hook commands for portability:**

```json
{
  "type": "command",
  "command": "bash ${CLAUDE_PLUGIN_ROOT}/scripts/validate.sh"
}
```

## Matchers

Control which tools trigger a hook:

| Pattern | Syntax | Example |
|---------|--------|---------|
| Exact match | `"matcher": "Write"` | Single tool |
| Multiple tools | `"matcher": "Read\|Write\|Edit"` | Pipe-separated |
| Wildcard | `"matcher": "*"` | All tools |
| Regex | `"matcher": "mcp__.*__delete.*"` | Pattern match |

**Common patterns:**
- All MCP tools: `mcp__.*`
- Specific plugin MCP: `mcp__plugin_asana_.*`
- All file operations: `Read|Write|Edit`
- Bash only: `Bash`

Matchers are case-sensitive. Plugin hooks merge with user's hooks and run in parallel.

## Best Practices

**DO:**
- Use prompt-based hooks for complex logic
- Use ${CLAUDE_PLUGIN_ROOT} for portability
- Validate all inputs in command hooks
- Quote all bash variables
- Set appropriate timeouts
- Return structured JSON output
- Test hooks thoroughly

**DON'T:**
- Use hardcoded paths
- Trust user input without validation
- Create long-running hooks
- Rely on hook execution order
- Modify global state unpredictably
- Log sensitive information

## Additional Resources

### Reference Files

- **`references/hook-events.md`** — Detailed event documentation with JSON examples, input/output formats, and exit codes. Read when implementing a specific hook event.
- **`references/patterns.md`** — 10 proven hook patterns (security validation, test enforcement, context loading, MCP monitoring, etc.). Read when looking for implementation examples.
- **`references/security.md`** — Input validation, path safety, variable quoting, timeout configuration. Read when the hook handles user input or file paths.
- **`references/debugging.md`** — Hook lifecycle, limitations, debug mode, testing scripts. Read when hooks aren't working as expected or when testing changes.
- **`references/migration.md`** — Guide for migrating from command hooks to prompt-based hooks. Read when converting existing command hooks.
- **`references/advanced.md`** — Multi-stage validation, conditional execution, hook chaining, cross-event workflows, performance optimization, external integrations. Read for complex automation scenarios.

### Example Hook Scripts

Working examples in `examples/`:
- **`validate-write.sh`** — File write validation (PreToolUse)
- **`validate-bash.sh`** — Bash command validation (PreToolUse)
- **`load-context.sh`** — SessionStart context loading

### Utility Scripts

Development tools in `scripts/`:
- **`validate-hook-schema.sh`** — Validate hooks.json structure
- **`test-hook.sh`** — Test hooks with sample input
- **`hook-linter.sh`** — Check hook scripts for common issues

### External Resources

- **Official Docs**: https://docs.claude.com/en/docs/claude-code/hooks
- **Testing**: Use `claude --debug` for detailed logs
- **Validation**: Use `jq` to validate hook JSON output

## Implementation Workflow

To implement hooks in a plugin:

1. Identify events to hook into (PreToolUse, Stop, SessionStart, etc.)
2. Decide between prompt-based (flexible) or command (deterministic) hooks
3. Write hook configuration in `hooks/hooks.json`
4. For command hooks, create hook scripts
5. Use ${CLAUDE_PLUGIN_ROOT} for all file references
6. Validate configuration with `scripts/validate-hook-schema.sh hooks/hooks.json`
7. Test hooks with `scripts/test-hook.sh` before deployment
8. Test in Claude Code with `claude --debug`
9. Document hooks in plugin README

Focus on prompt-based hooks for most use cases. Reserve command hooks for performance-critical or deterministic checks.
