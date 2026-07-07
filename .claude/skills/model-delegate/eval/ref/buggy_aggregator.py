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
