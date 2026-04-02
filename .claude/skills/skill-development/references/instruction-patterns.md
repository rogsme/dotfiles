# Instruction Patterns for Effective Skills

Proven patterns for writing SKILL.md instructions that produce reliable agent behavior.

## Pattern 1: Gotchas Sections

Environment-specific facts that defy reasonable assumptions. Keep in SKILL.md (not references/) for early visibility — the agent needs these before starting work.

```markdown
## Gotchas

- The `users` table uses soft deletes — `deleted_at IS NULL` must be in every query
- The `status` field is a string, not an enum — valid values: "active", "pending", "archived"
- The health endpoint at `/health` returns 200 even when the database is down — check `/health/deep` instead
- Deploy scripts expect `NODE_ENV=production` even in staging environments
```

**When to add:** After each iteration where the agent makes a wrong assumption, add a gotcha. These accumulate over time into a valuable knowledge base.

## Pattern 2: Output Templates

Concrete structure the agent can pattern-match against. Short templates go inline in SKILL.md; long ones in `assets/`.

```markdown
## Output Format

Generate the report in this exact format:

```
# Monthly Report: {YYYY-MM}

## Summary
- Total users: {count}
- Active users: {count} ({percentage}%)
- Revenue: ${amount}

## Details
{table with columns: metric, current, previous, change}
```
```

## Pattern 3: Checklists for Multi-Step Workflows

Explicit progress tracking prevents the agent from skipping steps or losing track in complex procedures.

```markdown
## Deployment Checklist

Complete each step in order. Do not skip steps.

- [ ] Run test suite: `npm test`
- [ ] Build production bundle: `npm run build`
- [ ] Verify bundle size < 500KB
- [ ] Update version in package.json
- [ ] Create git tag matching version
- [ ] Deploy to staging: `./deploy.sh staging`
- [ ] Run smoke tests against staging
- [ ] Deploy to production: `./deploy.sh production`
- [ ] Verify production health endpoint
```

## Pattern 4: Validation Loops

Do work, run validator, fix issues, repeat until clean. Prevents the agent from declaring success prematurely.

```markdown
## Workflow

1. Generate the migration file based on the schema diff
2. Run validation: `python scripts/validate_migration.py <file>`
3. If validation fails, read the error output, fix the migration, and re-run validation
4. Repeat until validation passes with zero errors
5. Only then proceed to apply the migration
```

## Pattern 5: Plan-Validate-Execute

Create an intermediate plan in structured format, validate it against a source of truth, then execute. The key element is a validation script that checks the plan against truth.

```markdown
## Workflow

1. Read the source schema from `references/schema.md`
2. Create a migration plan as JSON:
   ```json
   {
     "tables_to_create": [...],
     "columns_to_add": [...],
     "indexes_to_create": [...]
   }
   ```
3. Run `scripts/validate_plan.py plan.json` to check the plan against the current database state
4. If validation fails, adjust the plan and re-validate
5. Only after validation passes, generate the actual SQL migration from the plan
```

This pattern is especially valuable for:
- Database migrations (validate against current schema)
- API changes (validate against OpenAPI spec)
- Configuration changes (validate against existing config)

## Pattern 6: Bundling Reusable Scripts

If the agent reinvents the same logic each run, write a tested script and bundle it.

**Signs a script is needed:**
- The agent writes the same 20+ lines of code in every session
- The logic requires exact precision (parsing, formatting, calculations)
- The operation has subtle edge cases the agent keeps getting wrong

**Script requirements:**
- Accept all input via flags, env vars, or stdin (never interactive prompts)
- Include `--help` with brief description, flags, and examples
- Output structured data (JSON/CSV) on stdout, diagnostics on stderr
- Handle errors with clear messages about what went wrong and what to try

## Combining Patterns

Effective skills typically combine multiple patterns. A data pipeline skill might use:

1. **Gotchas** for known data quality issues
2. **Plan-validate-execute** for the pipeline design
3. **Validation loop** for each transformation step
4. **Checklist** for the deployment sequence
5. **Bundled script** for the validation logic

## Anti-Patterns to Avoid

### Too many options without defaults

```markdown
# Bad: forces agent to choose without guidance
Use either PostgreSQL, MySQL, or SQLite. Configure with JSON, YAML, or TOML.

# Good: clear default with alternatives noted
Use PostgreSQL with YAML configuration (default). For lightweight local development,
SQLite is also supported — adjust the connection string accordingly.
```

### Declarations instead of procedures

```markdown
# Bad: says WHAT but not HOW
The output should be a well-formatted report with proper error handling.

# Good: says HOW
1. Query the metrics table for the date range
2. Group by category, compute sum and average
3. Format as Markdown table with columns: Category, Total, Average, Change%
4. If any query fails, log the error and continue with remaining queries
```

### Over-explaining basics

```markdown
# Bad: wastes tokens on common knowledge
HTTP is a protocol for transferring data. JSON is a data format. APIs use endpoints.

# Good: jumps to the non-obvious
The payments API uses idempotency keys — always generate a UUID v4 and pass it
as X-Idempotency-Key. Retries without this header create duplicate charges.
```
