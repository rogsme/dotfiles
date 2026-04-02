# Evaluating Skill Output Quality

Systematic methodology for testing whether a skill improves agent performance, based on agentskills.io best practices.

## Overview

Run each test case **with and without** the skill to measure actual improvement. Track assertions, grading, and benchmarks across iterations.

## Designing Test Cases

Each test case has three parts:

| Part | Description |
|------|-------------|
| **Prompt** | Realistic user message (vary phrasing, detail, formality) |
| **Expected output** | Human description of what success looks like |
| **Input files** | Optional files the agent needs (data, configs, etc.) |

Store in `evals/evals.json` inside the skill directory:

```json
{
  "evals": [
    {
      "name": "top-months-chart",
      "prompt": "Show me which months had the most signups",
      "expected_output": "A bar chart showing monthly signup counts, sorted descending",
      "input_files": ["evals/fixtures/signups.csv"],
      "assertions": [
        "Output contains a chart image file",
        "Chart shows months on x-axis and counts on y-axis",
        "Months are sorted by signup count, not chronologically"
      ]
    }
  ]
}
```

### Test case guidelines

- Start with 2-3 cases, expand after first iteration
- Vary prompt style: formal, casual, terse, context-heavy
- Cover edge cases (empty input, large data, malformed input)
- Use realistic context (real file paths, column names, domain terms)

## Running Evals

### Workspace structure

```
skill-workspace/
  iteration-1/
    eval-top-months-chart/
      with_skill/
        outputs/           # Agent's output files
        timing.json        # {total_tokens, duration_ms}
        grading.json       # Assertion results
      without_skill/
        outputs/
        timing.json
        grading.json
    benchmark.json         # Aggregated comparison
  iteration-2/
    ...
```

### Execution requirements

- Each run needs a **clean context** (no leftover state from previous runs)
- Use subagents or separate sessions
- Provide: skill path, prompt, input files, output directory
- Record `total_tokens` and `duration_ms` per run

### Run each test twice

1. **With skill:** Agent has access to the skill
2. **Without skill:** Same prompt, no skill (baseline)

This comparison reveals what the skill actually contributes.

## Writing Assertions

Add assertions after the first round of outputs. Good assertions are:

| Quality | Example |
|---------|---------|
| Programmatically verifiable | "Output file is valid JSON" |
| Specific | "Contains exactly 12 rows, one per month" |
| Countable | "Chart has axis labels for both axes" |

Avoid:
- Vague: "Output looks good"
- Brittle: "Line 3 says exactly 'Total: 1,234'"
- Unverifiable: "Code is well-structured"

Reserve assertions for objectively checkable things. Leave subjective qualities for human review.

## Grading

Evaluate each assertion as PASS or FAIL with specific evidence:

```json
{
  "eval_name": "top-months-chart",
  "configuration": "with_skill",
  "results": [
    {
      "assertion": "Output contains a chart image file",
      "result": "PASS",
      "evidence": "Generated chart.png (245KB) in outputs/"
    },
    {
      "assertion": "Months are sorted by signup count",
      "result": "FAIL",
      "evidence": "Months appear in chronological order (Jan-Dec), not by count"
    }
  ],
  "summary": {
    "passed": 2,
    "failed": 1,
    "total": 3,
    "pass_rate": 0.67
  }
}
```

### Grading principles

- Require concrete evidence for PASS (quote output, reference file)
- Use scripts for mechanical checks (valid JSON, row count, file exists)
- Use LLM for subjective assertions only
- Review assertions themselves — too easy? Too hard? Unverifiable?
- For comparing versions: **blind comparison** (present outputs without revealing source)

## Aggregating Results

Create `benchmark.json` with statistics across runs:

```json
{
  "configurations": {
    "with_skill": {
      "pass_rate": {"mean": 0.83, "stddev": 0.12},
      "tokens": {"mean": 4500, "stddev": 800},
      "duration_ms": {"mean": 45000, "stddev": 5000}
    },
    "without_skill": {
      "pass_rate": {"mean": 0.50, "stddev": 0.20},
      "tokens": {"mean": 6200, "stddev": 1200},
      "duration_ms": {"mean": 62000, "stddev": 8000}
    }
  },
  "delta": {
    "pass_rate": "+0.33",
    "tokens": "-1700",
    "duration_ms": "-17000"
  }
}
```

## Analyzing Patterns

After aggregating results:

- **Remove always-pass assertions** — they inflate scores without signal
- **Investigate always-fail assertions** — is the skill broken or the assertion too hard?
- **Study pass-with/fail-without** — these show the skill's actual value
- **Tighten instructions for high-stddev results** — inconsistency means vague guidance
- **Check time/token outliers** — read execution transcripts to find waste

## Human Review

Catch issues that assertions miss. Record specific feedback:

```json
{
  "eval_name": "top-months-chart",
  "configuration": "with_skill",
  "feedback": [
    "Chart colors are hard to distinguish for colorblind users",
    "Legend overlaps with data points in the top-right"
  ]
}
```

Empty feedback array = passed human review.

## Iteration Loop

1. Feed eval signals + current SKILL.md to LLM for proposed improvements
2. Review and apply changes
3. Rerun evals in new `iteration-<N+1>/` directory
4. Grade, aggregate, human review
5. Repeat

### Iteration guidelines

- **Generalize:** Don't patch for specific test cases — fix the underlying instruction
- **Keep lean:** Remove instructions that don't improve pass rates
- **Explain why:** Add reasoning to SKILL.md so the agent can handle novel cases
- **Bundle repeated work:** If the agent keeps writing the same fix code, make it a script

### Automation

The `skill-creator` skill at `github.com/anthropics/skills` automates much of this workflow: running evals, grading, benchmarking, and description optimization.
