# Lifecycle Automation

Recommend lifecycle automation only for a repeated, deterministic event with a demonstrated benefit. The presence of tests, a type configuration, a formatter, or a lockfile alone is not evidence that every edit should trigger work.

## Product Mapping

- Claude Code supports lifecycle hooks in scoped settings and plugin components.
- OpenCode exposes lifecycle events through plugins; native permissions and formatters may solve enforcement or formatting with less code.
- Use the product's permission system rather than a model instruction when an operation must be denied.

Verify current event names, matcher semantics, input schema, exit behavior, scope, and configuration against official documentation before proposing exact configuration.

## Recommend When

- The same safe command must run at a well-defined lifecycle point.
- A policy needs deterministic enforcement and native permissions cannot express it.
- The repository already has a fast, non-interactive script suitable for automation.
- The user explicitly wants a notification or audit event unavailable natively.

## Avoid When

- The trigger is inferred only from a directory or config file.
- The action is slow, flaky, interactive, destructive, or environment-dependent.
- It would run broad test/typecheck suites after every edit without measured need.
- A formatter, LSP, CI job, permission rule, or existing script already covers it.
- The proposed hook parses commands with a fragile substring or regex security check.

## Required Report Details

State trigger frequency, command timeout, concurrency behavior, platform portability, dependencies, failure policy, permissions, and how to disable the automation. Estimate the cost of firing on a normal work session.

Official sources: [Claude Code hooks](https://code.claude.com/docs/en/hooks), [OpenCode plugins](https://opencode.ai/docs/plugins/), and [OpenCode permissions](https://opencode.ai/docs/permissions/).
