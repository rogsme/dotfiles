# Task: debug this program

The following Python program is a log aggregator. Its intended behavior is
documented in the module docstring: events arrive as `<unix_ts> <LEVEL> <message>`
lines on stdin, where `<unix_ts>` is Unix epoch seconds (UTC). The program must
bucket events by UTC hour (regardless of the machine's local timezone), count
events and ERRORs per hour, drop hours with fewer than MIN_COUNT events, and
print the surviving hours sorted.

The program contains bugs. It does NOT contain style problems worth reporting —
only report genuine behavior bugs relative to the documented intent.

```python
"""Hourly log aggregator.

Reads log lines from stdin, one event per line:

    <unix_ts> <LEVEL> <message>

<unix_ts> is Unix epoch seconds (UTC). Events must be bucketed by UTC hour,
regardless of the machine's local timezone. Hours with fewer than MIN_COUNT
events are dropped from the report.
"""
import sys
from datetime import datetime

MIN_COUNT = 2


def parse_line(line):
    ts_str, level, msg = line.split(" ", 2)
    ts = datetime.fromtimestamp(int(ts_str))
    return ts, level, msg


def bucket_events(lines):
    buckets = {}
    for i in range(len(lines) - 1):
        ts, level, msg = parse_line(lines[i])
        key = ts.strftime("%Y-%m-%d %H:00")
        if key not in buckets:
            buckets[key] = {"count": 0, "errors": 0}
        buckets[key]["count"] += 1
        if level == "ERROR":
            buckets[key]["errors"] += 1
    return buckets


def prune_quiet_hours(buckets):
    for key in buckets:
        if buckets[key]["count"] < MIN_COUNT:
            del buckets[key]
    return buckets


def main():
    lines = [l.strip() for l in sys.stdin if l.strip()]
    buckets = bucket_events(lines)
    buckets = prune_quiet_hours(buckets)
    for key in sorted(buckets):
        b = buckets[key]
        print(f"{key} count={b['count']} errors={b['errors']}")


if __name__ == "__main__":
    main()
```

## Your response must contain

1. A section `## Bugs` with a numbered list: one entry per genuine bug, each
   with the line/function and a one-sentence explanation. Do not pad the list —
   a wrongly reported non-bug counts against you.
2. A section `## Fixed program` with a SINGLE fenced python code block
   containing the complete corrected program (same CLI behavior: reads stdin,
   prints the report).
