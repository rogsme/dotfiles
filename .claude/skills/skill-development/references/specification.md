# Agent Skills Specification Reference

Complete specification details from agentskills.io for the SKILL.md format.

## Frontmatter Fields

### name (required)

- 1-64 characters
- Unicode lowercase alphanumeric characters and hyphens only
- No leading, trailing, or consecutive hyphens
- **Must match the parent directory name exactly**

Examples:
- `pdf-editor` (directory must be `pdf-editor/`)
- `big-query-analyzer` (directory must be `big-query-analyzer/`)

### description (required)

- 1-1024 characters
- Non-empty string
- Describes what the skill does AND when to use it
- Include keywords and phrases for agent matching
- This is the **sole trigger mechanism** — it carries the entire burden of activation

### license (optional)

License name or reference to a bundled license file.

```yaml
license: MIT
# or
license: See LICENSE.txt
```

### compatibility (optional)

- Max 500 characters
- Environment requirements: product names, packages, network access

```yaml
compatibility: Requires Python 3.10+, access to BigQuery API
```

### metadata (optional)

Arbitrary key-value string mapping for custom data.

```yaml
metadata:
  author: team-data
  category: analytics
  version: 2.1.0
```

### allowed-tools (optional, experimental)

Space-delimited list of tools the skill is pre-approved to use.

```yaml
allowed-tools: bash read write
```

## Body Content

- Markdown after the closing `---` of frontmatter
- No restrictions on Markdown structure
- Recommended sections: step-by-step instructions, input/output examples, edge cases
- **Keep under 500 lines / 5000 tokens**
- Split longer content into files under `references/`

## File References

- Use relative paths from the skill root directory
- Keep references one level deep (avoid deeply nested chains)
- Tell the agent WHEN to load each reference, not just that it exists

```markdown
Read `references/api-errors.md` if the API returns a non-200 status code.
Run `scripts/validate.py` after generating any output file.
```

## Directory Structure

```
skill-name/              # Must match `name` field
├── SKILL.md             # Required
├── scripts/             # Optional: executable code
├── references/          # Optional: docs loaded on demand
└── assets/              # Optional: templates, images, static resources
```

### scripts/

- Self-contained executable code (Python, Bash, JS, etc.)
- Must produce helpful error messages
- Must handle edge cases gracefully
- No interactive prompts

### references/

- Additional documentation files (Markdown, text, etc.)
- Loaded on demand by the agent
- Keep each file focused on one topic
- Common patterns: REFERENCE.md, FORMS.md, domain-specific files

### assets/

- Static resources used in output (not loaded into context)
- Templates, images, data files, schemas
- Copied or modified during skill execution

## Validation

Use the reference library validator:

```bash
skills-ref validate ./my-skill
```

Checks:
- YAML frontmatter format and required fields
- Name conventions and directory name match
- Description completeness
- File organization

## Discovery Locations

Agents scan these directories for skills (varies by client):

| Scope | Path |
|-------|------|
| Cross-client standard | `.agents/skills/` |
| Claude Code project | `.claude/skills/` |
| Claude Code user | `~/.claude/skills/` |
| VS Code / Copilot | `.<client>/skills/` |

**Name collisions:** Project-level overrides user-level. Within the same scope, first-found wins (behavior varies by client).

**Trust:** Project-level skills (from cloned repos) may be untrusted. Some agents gate activation on trust checks.
