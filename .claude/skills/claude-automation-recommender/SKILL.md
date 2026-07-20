---
name: claude-automation-recommender
description: Analyze a repository and recommend evidence-backed Claude Code or OpenCode automation. Use for setup reviews, workflow optimization, or recommendations for hooks, agents, skills, plugins, and MCP servers.
compatibility: Read-only analysis for Claude Code and OpenCode; recommendations must identify the target product and supported capability.
---

# Automation Recommender

Remain read-only. Do not create, edit, install, enable, authenticate, or execute a recommended automation.

## 1. Identify The Environment

Determine which products are actually used. Inspect only relevant repository and user configuration; do not search unrelated home directories or print secrets.

For Claude Code, inspect when present:

- effective `CLAUDE.md`, `CLAUDE.local.md`, and `.claude/rules/`
- `.claude/settings.json`, `.claude/settings.local.json`, and relevant user settings
- `.claude/agents/`, `.claude/skills/`, legacy commands, hooks, permissions, enabled plugins, and `.mcp.json`
- installed or configured built-ins exposed by the current version

For OpenCode, inspect when present:

- effective `AGENTS.md` or Claude-compatible fallback instructions
- `opencode.json`/`opencode.jsonc` and relevant global configuration
- `.opencode/agents/`, `.opencode/skills/`, `.opencode/plugins/`, permissions, formatters, LSP, and MCP configuration
- built-in Build, Plan, General, Explore, Scout, and other capabilities exposed by the installed version

Use safe version, list, help, or status operations only when they are available and genuinely read-only. Report inaccessible configuration instead of guessing.

## 2. Profile Repeated Work

Ground opportunities in repository evidence such as:

- repeated documented procedures or repeated user corrections
- CI checks that developers routinely reproduce locally
- project-specific review rules with clear inputs and outputs
- external systems whose data is repeatedly copied into sessions
- expensive exploration that a focused agent could isolate
- existing automation that is duplicated, broken, or underused

A test directory, `tsconfig.json`, dependency, or framework name alone is not enough to justify automation. Require a concrete workflow, pain point, policy, or integration need.

## 3. Prefer Existing Capabilities

For each opportunity, check in order:

1. Existing repository or user configuration
2. Product built-ins and native permissions, formatters, LSP, CLI, or integrations
3. A small project instruction or skill
4. A focused agent or lifecycle hook/plugin
5. A verified external plugin or MCP server

Do not recommend a duplicate of an installed skill, configured MCP server, existing script, native CLI, or built-in agent. Prefer the lowest-maintenance capability that solves the observed problem.

Read the matching reference only when needed:

- [hooks-patterns.md](references/hooks-patterns.md): lifecycle automation and evidence thresholds
- [subagent-templates.md](references/subagent-templates.md): agent selection
- [skills-reference.md](references/skills-reference.md): repeatable instruction workflows
- [plugins-reference.md](references/plugins-reference.md): distributable or event-driven extensions
- [mcp-servers.md](references/mcp-servers.md): external systems and data access

## 4. Verify Before Recommending

Prefer current official product and publisher documentation. Record the source URL and retrieval date for version-sensitive claims.

For every recommendation, verify:

- it exists and supports the target product/version
- its capability is not already built in or configured
- the exact installation or configuration procedure
- minimum permissions and credentials
- data sent outside the workstation or trust boundary
- startup, context-token, model, network, and execution cost
- update ownership and maintenance burden
- failure modes, supply-chain risk, prompt-injection exposure, and rollback/removal path

For third-party MCP servers, plugins, and skills, also verify the publisher identity, canonical source repository or registry, recent maintenance, license, and release provenance. If any required item cannot be verified, do not recommend installation; list it under `Not recommended / unverified` with the missing evidence.

Never copy install commands from aggregators, blog posts, or stale local catalogs when an official source is available.

## 5. Report All Justified Findings

Include every recommendation that clears the evidence and verification bar; do not enforce a numeric quota. Rank by value first and maintenance cost second. Skip categories with no justified addition, but always evaluate and report the Plugins category consistently.

```markdown
## Automation Recommendations

### Environment
- **Products/versions:** ...
- **Existing configuration and built-ins:** ...
- **Evidence inspected:** ...
- **Blind spots:** ...

### Ranked Findings
#### 1. [Recommendation]
- **Type / product:** Hook, agent, skill, plugin, MCP, or native capability; Claude Code/OpenCode
- **Value:** High/Medium/Low, with repository evidence
- **Maintenance cost:** Low/Medium/High, with owner and recurring work
- **Why existing capabilities are insufficient:** ...
- **Exact setup:** verified command or configuration, including scope
- **Minimum permissions:** ...
- **Data boundary:** local files/services/data transmitted and destination
- **Runtime cost:** startup, tokens, model calls, processes, or network calls
- **Risks and rollback:** ...
- **Sources:** official/canonical URLs and retrieval date

### Plugins
- Recommended findings, or `No plugin is justified; existing/standalone capabilities cover the observed needs.`

### Not Recommended / Unverified
- Candidate, evidence gap, duplication, or disproportionate cost
```

Keep recommendations actionable and repository-specific. Distinguish facts from inferences and call out platform differences instead of presenting Claude Code and OpenCode configuration as interchangeable.
