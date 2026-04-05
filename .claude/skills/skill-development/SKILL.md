---
name: skill-development
description: This skill should be used when the user wants to "create a skill", "write a new skill", "improve a skill", "optimize skill description", "evaluate a skill", "add skill to plugin", "design scripts for agents", or needs guidance on skill structure, progressive disclosure, frontmatter specification, or skill development best practices. Also use when user mentions SKILL.md, skill triggers, or agent skills.
version: 0.2.0
---

# Skill Development Guide

Create effective agent skills following the open Agent Skills specification (agentskills.io). Skills are portable across 30+ agent products including Claude Code, Cursor, VS Code Copilot, Gemini CLI, and others.

## Core Concepts

A skill is a folder containing a `SKILL.md` file with YAML frontmatter and Markdown instructions. Optional bundled resources extend the skill's capabilities.

```
skill-name/
├── SKILL.md           # Required: metadata + instructions
├── scripts/           # Optional: executable code (Python/Bash/etc.)
├── references/        # Optional: docs loaded on demand
└── assets/            # Optional: templates, images, resources for output
```

### Progressive Disclosure

Skills load incrementally to manage context:

| Tier | What loads | When | Token cost |
|------|-----------|------|------------|
| 1. Catalog | name + description | Session start | ~50-100 tokens/skill |
| 2. Instructions | Full SKILL.md body | Skill activated | <5000 tokens |
| 3. Resources | scripts/, references/, assets/ | Referenced by instructions | Varies |

Keep SKILL.md under **500 lines / 5000 tokens**. Move detailed content to `references/` with explicit load conditions (e.g., "Read `references/api-errors.md` if the API returns non-200").

## Frontmatter Specification

### Required Fields

| Field | Constraints |
|-------|-------------|
| `name` | 1-64 chars. Lowercase letters, numbers, hyphens only. No leading/trailing/consecutive hyphens. **Must match parent directory name.** |
| `description` | 1-1024 chars. Describe what the skill does AND when to use it. Include keywords for agent matching. |

### Optional Fields

| Field | Purpose |
|-------|---------|
| `license` | License name or reference to bundled file |
| `compatibility` | Max 500 chars. Environment requirements (product, packages, network) |
| `metadata` | Arbitrary key-value string mapping |
| `allowed-tools` | Space-delimited list of pre-approved tools (experimental) |

### Writing Effective Descriptions

The description carries the **entire burden of triggering**. Agents only consult skills for tasks requiring knowledge beyond their baseline.

- Use imperative phrasing: "Use this skill when..." or "This skill should be used when..."
- Focus on user intent, not implementation details
- Be pushy — explicitly list contexts, including indirect ones
- Include specific trigger phrases users would say
- Keep under 1024 characters

```yaml
# Good: specific triggers, covers indirect use
description: This skill should be used when the user asks to "create a hook", "add a PreToolUse hook", "validate tool use", or mentions hook events. Also use when debugging hook failures or reviewing hooks.json configuration.

# Bad: vague, no triggers
description: Provides guidance for working with hooks.
```

For systematic description optimization, consult `references/optimizing-descriptions.md`.

## Skill Creation Process

### Step 1: Start from Real Expertise

Do NOT just ask an LLM to generate a skill from general knowledge — results are vague and generic.

**Extract from hands-on tasks:** Complete a real task with an agent, note steps that worked, corrections made, I/O formats, context provided. Extract the reusable pattern.

**Synthesize from project artifacts:** Feed real internal docs, runbooks, API specs, code review comments, VCS history, and failure cases into the skill. Project-specific material beats generic references.

Ask the user concrete questions:
- "What tasks should this skill handle? Give examples."
- "What would a user say that should trigger this skill?"
- "What domain knowledge or procedures does the agent lack?"

### Step 2: Plan Reusable Contents

Analyze each concrete use case:

1. What code gets rewritten every time? → `scripts/`
2. What documentation must be rediscovered? → `references/`
3. What templates or files are used in output? → `assets/`

### Step 3: Create Structure

Before creating files, ask the user where the skill should live using the AskUserQuestion tool:

- **User-level** (`~/.claude/skills/skill-name/`) — available in all projects for this user
- **Project-level** (`.claude/skills/skill-name/`) — scoped to the current repo, shared with collaborators

Ask: "Should this skill be user-level (available in all your projects) or project-level (scoped to this repo and shared with collaborators)?"

Default recommendation: project-level, unless the skill is clearly personal workflow (not repo-specific).

Then create the structure in the chosen location:

```bash
mkdir -p skills/skill-name/{references,scripts,assets}
touch skills/skill-name/SKILL.md
```

**Other directory conventions (less common):**
- Plugin skills: `plugin-name/skills/skill-name/`
- Cross-client: `.agents/skills/skill-name/` (widely adopted standard)

Create only the subdirectories actually needed.

### Step 4: Write the Skill

Write for another AI instance. Focus on information that is beneficial and non-obvious. Include procedural knowledge, domain-specific details, and edge cases the agent would otherwise miss.

**Writing style:** Use imperative/infinitive form throughout. "Parse the frontmatter" not "You should parse the frontmatter."

**SKILL.md structure:**
1. Brief purpose statement (2-3 sentences)
2. Core workflow / step-by-step instructions
3. Key gotchas and edge cases (inline for early visibility)
4. Pointers to bundled resources

**What to include vs. omit:**
- Add what the agent lacks: project conventions, domain procedures, specific APIs
- Omit what it already knows: general programming, HTTP basics, common formats
- Design coherent units: not too narrow (multiple skills for one task) or too broad (hard to trigger precisely)

**Reference resources explicitly:**
```markdown
## Resources
- **`references/schema.md`** — Database schema. Read when writing queries.
- **`scripts/validate.py`** — Run after generating output to verify correctness.
- **`assets/template.html`** — Base template. Copy and modify for new pages.
```

For detailed instruction patterns (gotchas, checklists, validation loops, plan-validate-execute), consult `references/instruction-patterns.md`.

### Step 5: Evaluate and Test

Run the skill against real tasks. Feed ALL results back, not just failures. Read execution traces, not just outputs. Look for:
- Vague instructions (agent tries multiple approaches)
- Irrelevant instructions (followed anyway, wasting tokens)
- Too many options without clear defaults

For systematic evaluation with evals.json, assertions, grading, and benchmarking, consult `references/evaluating-skills.md`.

**Quick validation checklist:**
- [ ] SKILL.md has valid frontmatter with name + description
- [ ] Name matches parent directory, lowercase+hyphens only
- [ ] Description includes specific trigger phrases (<1024 chars)
- [ ] Body uses imperative form, under 500 lines
- [ ] All referenced files exist
- [ ] Scripts are executable and non-interactive

Validate with: `skills-ref validate ./my-skill` (from the agentskills reference library).

### Step 6: Iterate

1. Use the skill on real tasks
2. Read execution traces, not just outputs
3. Strengthen weak instructions, remove noise
4. Rerun and compare — generalize fixes, don't patch for specific test cases

## Calibrating Control

Match specificity to the fragility of the task:

- **Flexible tasks** (writing, analysis): Explain WHY and give freedom
- **Fragile tasks** (migrations, deployments): Be prescriptive with exact commands and "do not modify" guards
- **Provide defaults, not menus:** Pick one recommended approach; mention alternatives briefly
- **Favor procedures over declarations:** Teach HOW to approach a class of problems, not what to produce for one instance

## Script Design for Agents

Scripts in `scripts/` must work in non-interactive agent sessions:

- **No interactive prompts** (hard requirement) — accept input via flags/env vars/stdin
- **Include `--help`** — brief description, flags, examples
- **Helpful error messages** — what went wrong, what was expected, what to try
- **Structured output** — prefer JSON/CSV; separate data (stdout) from diagnostics (stderr)
- **Idempotent** — agents may retry; same input should produce same result
- **Predictable output size** — default to summary; support `--offset`/`--output` for large data

For detailed script design guidance including dependency management (uv, deno, bun), consult `references/script-design.md`.

## Additional Resources

### Reference Files

- **`references/specification.md`** — Complete frontmatter spec, naming rules, validation details
- **`references/instruction-patterns.md`** — Gotchas, checklists, validation loops, plan-validate-execute, templates
- **`references/evaluating-skills.md`** — Eval methodology: evals.json, assertions, grading, benchmarking, iteration
- **`references/optimizing-descriptions.md`** — Trigger testing, eval queries, train/validation splits, optimization loop
- **`references/script-design.md`** — Non-interactive scripts, dependency management, structured output, self-contained scripts
- **`references/skill-creator-original.md`** — Original skill-creator content from Anthropic

### External Resources

- **agentskills.io** — Official specification and documentation
- **github.com/agentskills/agentskills** — Spec repo with `skills-ref` validation tool
- **github.com/anthropics/skills** — Example skills and the `skill-creator` meta-skill that automates eval workflows
