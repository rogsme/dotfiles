# Skill Recommendations

Recommend a skill for a repeated instruction-heavy workflow that should load on demand. Keep stable project facts in repository instructions and deterministic enforcement in permissions or lifecycle automation.

## Existing Capability Check

- Inspect project, user, compatible, and plugin-provided skills plus product built-ins.
- Prefer improving an existing skill over creating an overlapping one.
- Confirm each product's discovery locations and supported frontmatter before proposing a file.
- Use the common Agent Skills fields for cross-product skills; isolate product-specific behavior and declare compatibility.

## Good Evidence

- The same multi-step prompt or checklist recurs.
- A procedure currently bloats always-loaded instructions.
- The workflow needs bundled templates, examples, or safe validation scripts.
- Inputs, outputs, approval points, and completion criteria are stable.

## Poor Evidence

- A framework or file type merely exists.
- The task is one line, already a script, or already built in.
- The workflow has side effects but lacks explicit invocation or approval boundaries.
- A large generic example collection would be copied into the repository.

## Proposal Requirements

Provide the minimal `SKILL.md` diff, target scope, trigger wording, compatibility, side effects, required capabilities, and one verification scenario. Add supporting files only when the main body would otherwise be unclear or excessively long.

For third-party skills, apply the same publisher, source, install, permission, data-boundary, runtime-cost, maintenance, and risk checks as plugins.

Official sources: [Claude Code skills](https://code.claude.com/docs/en/skills), [OpenCode skills](https://opencode.ai/docs/skills/), and [Agent Skills specification](https://agentskills.io/).
