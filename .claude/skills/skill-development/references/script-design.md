# Script Design for Agentic Use

Detailed guide for writing scripts that work reliably when executed by AI agents in non-interactive sessions.

## One-Off Commands (No scripts/ Directory Needed)

For simple operations, reference existing packages directly in SKILL.md:

| Runner | Language | Example |
|--------|----------|---------|
| `uvx` | Python (recommended) | `uvx black@24.4.2 file.py` |
| `pipx` | Python | `pipx run black file.py` |
| `npx` | Node.js | `npx prettier@3.2.0 --write file.js` |
| `bunx` | Bun | `bunx esbuild app.ts --bundle` |
| `deno run` | Deno | `deno run https://deno.land/std/examples/welcome.ts` |
| `go run` | Go | `go run golang.org/x/tools/cmd/stringer@latest` |

**Tips:**
- Pin versions for reproducibility
- State prerequisites in SKILL.md or the `compatibility` frontmatter field
- Move complex multi-line commands into scripts

## Hard Requirements for Agent Scripts

### 1. No Interactive Prompts

Agents run in non-interactive shells. Any prompt for input (stdin read, confirmation dialog, interactive menu) will hang or fail silently.

```python
# BAD: hangs waiting for input
confirm = input("Proceed? (y/n): ")

# GOOD: accept via flag
parser.add_argument("--confirm", action="store_true", help="Skip confirmation")
if not args.confirm:
    print("Error: Pass --confirm to proceed", file=sys.stderr)
    sys.exit(1)
```

Accept all input through:
- Command-line flags (`--output`, `--format json`)
- Environment variables (`API_KEY`, `DATABASE_URL`)
- Stdin piping (`echo '{"data": ...}' | python script.py`)

### 2. Include --help

Every script must support `--help` with:
- Brief description of what the script does
- All available flags with descriptions
- 1-2 usage examples

Keep help text concise — it enters the agent's context window.

```
Usage: validate_migration.py [OPTIONS] MIGRATION_FILE

Validate a database migration file against the current schema.

Options:
  --schema PATH    Path to schema file (default: schema.sql)
  --strict         Fail on warnings, not just errors
  --format FORMAT  Output format: text, json (default: text)

Examples:
  validate_migration.py migrations/001_add_users.sql
  validate_migration.py --strict --format json migrations/002_add_orders.sql
```

### 3. Helpful Error Messages

Say what went wrong, what was expected, and what to try:

```python
# BAD
print("Error")
sys.exit(1)

# GOOD
print(f"Error: File '{path}' not found.", file=sys.stderr)
print(f"Expected: A .sql migration file in the migrations/ directory.", file=sys.stderr)
print(f"Try: ls migrations/ to see available files.", file=sys.stderr)
sys.exit(1)
```

### 4. Structured Output

Separate data from diagnostics:
- **stdout**: Machine-readable output (JSON, CSV, TSV)
- **stderr**: Human-readable diagnostics, progress, warnings

```python
import json, sys

# Progress/diagnostics → stderr
print("Processing 1,234 records...", file=sys.stderr)

# Data → stdout as JSON
result = {"total": 1234, "valid": 1200, "errors": 34}
json.dump(result, sys.stdout, indent=2)
```

## Recommended Practices

### Idempotency

Agents may retry scripts. Running the same command twice with the same input should produce the same result without side effects.

```python
# BAD: appends on every run
with open("output.txt", "a") as f:
    f.write(result)

# GOOD: overwrites (idempotent)
with open("output.txt", "w") as f:
    f.write(result)
```

### Predictable Output Size

Many agent harnesses truncate output at 10-30K characters. Design for this:

- Default to summary output
- Support `--verbose` for full details
- Support `--offset` and `--limit` for pagination
- Use `--output FILE` for large data (write to file, print path to stdout)

```python
if args.output:
    with open(args.output, "w") as f:
        json.dump(full_results, f)
    print(f"Results written to {args.output} ({len(full_results)} records)")
else:
    # Print summary only
    print(f"Total: {len(full_results)} records")
    print(f"Errors: {error_count}")
```

### Safe Defaults

Destructive operations should require explicit opt-in:

```python
parser.add_argument("--force", action="store_true",
    help="Actually delete files (default: dry run)")

if not args.force:
    print("DRY RUN: Would delete the following files:")
    for f in files_to_delete:
        print(f"  {f}")
    print("\nPass --force to actually delete.")
else:
    for f in files_to_delete:
        os.remove(f)
        print(f"Deleted: {f}")
```

### Meaningful Exit Codes

Document non-zero exit codes in `--help`:

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | General error |
| 2 | Invalid arguments |
| 3 | Validation failed (with details on stderr) |
| 4 | Network/external service error |

### Input Constraints

Reject ambiguous input early. Use enums where possible:

```python
VALID_FORMATS = ["json", "csv", "tsv"]
if args.format not in VALID_FORMATS:
    print(f"Error: Invalid format '{args.format}'. Must be one of: {', '.join(VALID_FORMATS)}", 
          file=sys.stderr)
    sys.exit(2)
```

## Self-Contained Scripts with Inline Dependencies

### Python (PEP 723 + uv)

```python
# /// script
# requires-python = ">=3.10"
# dependencies = [
#     "pandas>=2.0",
#     "matplotlib>=3.7",
# ]
# ///

import pandas as pd
import matplotlib.pyplot as plt
# ... script body
```

Run with: `uv run scripts/analyze.py`

### Deno (TypeScript/JavaScript)

```typescript
import { parse } from "npm:csv-parse@5.5.0/sync";
import { readFileSync } from "node:fs";

const data = parse(readFileSync("data.csv", "utf-8"), { columns: true });
// ... script body
```

Run with: `deno run --allow-read scripts/analyze.ts`

### Bun

```javascript
import { Database } from "bun:sqlite";

// Bun auto-installs missing packages
import papa from "papaparse@5.4.1";
// ... script body
```

Run with: `bun scripts/analyze.js`

### Ruby (bundler/inline)

```ruby
require "bundler/inline"

gemfile do
  source "https://rubygems.org"
  gem "csv", "~> 3.2"
  gem "terminal-table", "~> 3.0"
end

# ... script body
```

Run with: `ruby scripts/analyze.rb`

## Referencing Scripts from SKILL.md

List available scripts explicitly so the agent knows they exist:

```markdown
## Available Scripts

- **`scripts/validate.py`** — Validates migration files against the current schema.
  Run: `uv run scripts/validate.py <migration-file> [--strict]`

- **`scripts/generate_report.py`** — Generates formatted reports from query results.
  Run: `uv run scripts/generate_report.py --input data.json --format html`
```

Include the run command so the agent doesn't need to read the script to know how to execute it.
