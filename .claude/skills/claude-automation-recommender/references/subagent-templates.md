# Agent Recommendations

Use an agent when isolation, reusable specialization, or context containment provides concrete value. Do not create a custom agent merely to rename ordinary code review or exploration.

## Check Built-ins First

- Claude Code provides built-in exploration, planning, and general-purpose agents; verify the installed version's current set.
- OpenCode provides Build and Plan primary agents plus General, Explore, and Scout subagents.
- Reuse a built-in unless the repository needs a stable custom prompt, narrower permissions, different model/cost profile, or specialized integration.

## Evidence Threshold

Recommend a custom agent only when all apply:

- A recurring task has a clear boundary and expected output.
- Existing built-ins or skills do not provide the needed isolation or policy.
- Required capabilities and permissions can be constrained.
- The value exceeds extra model calls, context, configuration, and maintenance.

## Minimal Definition To Propose

Specify target product, scope, description/trigger, prompt responsibilities, model selection rationale, permission boundary, maximum work or cost limit when supported, and verification procedure. Use current product-native fields; Claude Code and OpenCode agent frontmatter are not interchangeable.

For analysis agents, default to read-only capability. Grant shell, network, MCP, or write access only when the task requires it and disclose the consequence.

Official sources: [Claude Code subagents](https://code.claude.com/docs/en/sub-agents) and [OpenCode agents](https://opencode.ai/docs/agents/).
