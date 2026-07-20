# MCP Recommendations

Recommend MCP only when the workflow needs structured access to an external system and built-in tools, a native CLI/API, or an existing configured server do not suffice. MCP tools consume context and expand the trust boundary.

## Evidence Threshold

- Users repeatedly transfer data between the system and agent sessions, or need an operation unavailable locally.
- The required read/write actions and scopes are explicit.
- Expected frequency and value justify connection, context, authentication, and maintenance costs.

## Required Verification

For each server provide:

- target product and current supported transport
- verified publisher, canonical source, package/endpoint identity, license, and maintenance status
- exact install/configuration and removal steps from official publisher documentation
- pinned version or update policy for local packages
- minimum OAuth scopes, tokens, filesystem roots, and tool permissions
- data sent to the server, server operator, retention boundary when documented, and secret handling
- tool count/context impact, startup processes, network calls, latency, and monetary cost
- prompt-injection, tool-poisoning, data mutation, production-access, and supply-chain risks
- a least-privilege rollout and read-only validation plan

Do not recommend generic filesystem, memory, database, container, or source-hosting servers when native capabilities already cover the need. Never place credentials directly in checked-in examples.

Official sources: [Claude Code MCP](https://code.claude.com/docs/en/mcp), [OpenCode MCP](https://opencode.ai/docs/mcp-servers/), and the [MCP specification](https://modelcontextprotocol.io/specification/).
