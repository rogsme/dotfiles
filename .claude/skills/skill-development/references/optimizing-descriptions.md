# Optimizing Skill Descriptions

Systematic methodology for improving skill trigger accuracy, based on agentskills.io best practices.

## How Triggering Works

The description is the **sole trigger mechanism**. Agents only consult skills for tasks requiring knowledge beyond their baseline. Simple tasks may not trigger a skill even with a matching description.

This means:
- A perfect skill with a weak description will never activate
- Description quality directly determines skill usefulness
- Optimization requires systematic testing, not guesswork

## Writing Effective Descriptions

### Core principles

1. **Use imperative phrasing:** "Use this skill when..." not "This skill does..."
2. **Focus on user intent, not implementation:** Describe the problem being solved, not the technique
3. **Be pushy:** Explicitly list contexts, including indirect ones ("even if they don't explicitly mention 'CSV'")
4. **Keep concise:** Few sentences to a short paragraph. Hard limit: 1024 characters

### Example

```yaml
# Weak: vague, passive
description: A skill for working with CSV data analysis and visualization.

# Strong: imperative, pushy, covers indirect triggers
description: Use this skill when the user asks to analyze data, create charts, generate reports from spreadsheets, or work with CSV/TSV files. Also activate when the user provides a data file and asks questions about it, even if they don't explicitly mention data analysis. Covers pandas, matplotlib, and common data transformation workflows.
```

## Designing Trigger Eval Queries

Create ~20 test queries stored in `eval_queries.json`:

```json
{
  "train": [
    {"query": "Show me which months had the most signups", "should_trigger": true},
    {"query": "Make a bar chart of revenue by quarter", "should_trigger": true},
    {"query": "What's in this CSV file?", "should_trigger": true},
    {"query": "Help me understand this data", "should_trigger": true},
    {"query": "Write a Python web server", "should_trigger": false},
    {"query": "Fix the login bug", "should_trigger": false},
    {"query": "Create a database migration", "should_trigger": false},
    {"query": "Refactor this class", "should_trigger": false}
  ],
  "validation": [
    {"query": "Summarize the trends in this spreadsheet", "should_trigger": true},
    {"query": "Plot the distribution of response times", "should_trigger": true},
    {"query": "Help me write unit tests", "should_trigger": false},
    {"query": "Deploy this to production", "should_trigger": false}
  ]
}
```

### Should-trigger queries (8-10)

Vary across these dimensions:
- **Phrasing:** Formal, casual, with typos
- **Explicitness:** Direct ("analyze this CSV") vs. indirect ("what does this data show?")
- **Detail:** Terse ("chart this") vs. context-heavy ("I have a 50MB CSV with user signups...")
- **Complexity:** Single-step vs. multi-step

**Most valuable:** Queries where the skill would help but the connection isn't obvious.

### Should-not-trigger queries (8-10)

Focus on **near-misses** — queries that share keywords but need something different:
- "Create a data model" (shares "data" but is a schema design task)
- "Parse this JSON response" (shares "data" but is a coding task)
- "Set up a monitoring dashboard" (shares "chart" concept but is infra)

Strong negatives share concepts but require different capabilities.

## Testing Process

### Running trigger tests

Run each query through the agent with the skill installed. Check if SKILL.md was loaded (appears in context or tool call logs).

**Run each query 3 times** due to nondeterminism. Compute trigger rate:

| Query | Run 1 | Run 2 | Run 3 | Rate |
|-------|-------|-------|-------|------|
| "Show me which months..." | Yes | Yes | No | 0.67 |
| "Write a Python web server" | No | No | No | 0.00 |

### Pass thresholds

- Should-trigger queries: rate > 0.5
- Should-not-trigger queries: rate < 0.5

### Claude Code testing script

```bash
# Test a single query
echo '{"query": "Show me which months had the most signups"}' | \
  claude --output-format json -p "$(cat query.txt)" | \
  jq '.result | test("SKILL.md")'
```

## Train/Validation Splits

- **60% train / 40% validation** to avoid overfitting
- Proportional mix of positive and negative in both sets
- **Fixed split across iterations** — never move queries between sets

Optimize against the train set only. Use the validation set to detect overfitting (description triggers on trained examples but fails on novel ones).

## Optimization Loop

1. Evaluate on both train and validation sets
2. Identify failures in the **train set only**
3. Revise description:
   - **Missed triggers:** Broaden language, add intent phrases
   - **False triggers:** Narrow scope, add "do not use when..." clauses
   - **Avoid keyword stuffing:** Don't add specific words from failed queries — try structural rewrites
   - **Check 1024-char limit** after each revision
4. Repeat until train set passes or improvement plateaus
5. Select best iteration by **validation pass rate** (may not be the last one)

Typically ~5 iterations is sufficient. The `skill-creator` meta-skill at `github.com/anthropics/skills` automates this loop.

## Common Description Pitfalls

| Pitfall | Example | Fix |
|---------|---------|-----|
| Too narrow | "Use when user says 'analyze CSV'" | Add indirect triggers: "work with data", "make a chart" |
| Too broad | "Use for any coding task" | Scope to specific domain: "data analysis and visualization" |
| Implementation-focused | "Uses pandas and matplotlib" | Intent-focused: "analyze data and create charts" |
| Missing indirect triggers | Only covers explicit requests | Add: "even if they don't mention data analysis" |
| Passive voice | "This skill provides..." | Imperative: "Use this skill when..." |
