# Plugin Recommendations

Plugins are a distribution and event-extension mechanism, not a default answer. Evaluate this category for every report, even when the result is that no plugin is justified.

## Product Difference

- Claude Code plugins can package skills, agents, hooks, MCP servers, and related components through marketplaces or local plugin directories.
- OpenCode plugins are JavaScript/TypeScript modules loaded from configuration or plugin directories and can subscribe to events or add tools.
- A plugin for one product is not automatically compatible with the other.

## Prefer Standalone Configuration When

- One repository needs one small skill, agent, permission rule, or hook.
- There is no distribution, versioning, or multi-component requirement.
- Native formatting, LSP, CLI, or built-in behavior solves the need.

## Third-Party Verification

Do not recommend a named plugin without all of:

- verified publisher and canonical repository/registry or marketplace entry
- exact product-specific install and removal procedure from the official source
- reviewed manifest/package contents and minimum permissions
- data boundary and network behavior
- startup/runtime/model/context cost
- release activity, maintenance owner, license, and update path
- supply-chain, arbitrary-code-execution, prompt-injection, and credential risks

If these are incomplete, report the candidate as unverified rather than supplying an install command.

Official sources: [Claude Code plugins](https://code.claude.com/docs/en/plugins), [Claude Code plugin discovery](https://code.claude.com/docs/en/discover-plugins), and [OpenCode plugins](https://opencode.ai/docs/plugins/).
