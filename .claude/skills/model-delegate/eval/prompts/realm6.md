# Task: implement `next_fire` for cron expressions

Implement a Python function `next_fire(expr, after)` that returns the first
datetime a cron expression fires STRICTLY AFTER a given datetime.

## Spec

`expr` is a 5-field cron string: `minute hour day-of-month month day-of-week`,
separated by single spaces. Field syntax (numeric only, no names like JAN/MON):

- `*` — all values.
- Single value: `5`.
- List: `1,15,30` (elements may be values, ranges, or stepped ranges).
- Range: `1-5` (inclusive).
- Step: `*/15` or `10-40/5` — every Nth value starting from the range start.
  A step never follows a bare single value.

Field domains: minute 0-59, hour 0-23, day-of-month 1-31, month 1-12,
day-of-week 0-6 where **0 = Sunday**, 6 = Saturday.

Day matching rule (standard cron): if BOTH day-of-month and day-of-week are
restricted (neither is `*`), the day matches when EITHER matches. If exactly
one is restricted, only that one is checked. If both are `*`, every day matches.

`after` is a naive `datetime.datetime`. The result is the first minute-aligned
naive datetime strictly after `after` (truncate seconds/microseconds; the
returned datetime has second=0, microsecond=0). Assume a valid expression that
fires at least once within a few years. Mind month lengths and leap years.

## Requirements

- Python 3 standard library only. Correctness matters more than speed, but the
  function must resolve any of the above within a few seconds.
- Respond with a SINGLE fenced python code block containing the complete
  implementation. Minimal prose outside the block.
