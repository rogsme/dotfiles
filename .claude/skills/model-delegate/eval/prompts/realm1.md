# Task: implement `resolve_schedule`

Implement a Python function `resolve_schedule(intervals)` exactly to this spec.

## Input

`intervals` is a list of tuples `(start, end, priority)` where `start`, `end`,
`priority` are integers, `0 <= start < end`, `priority >= 0`. The list may be
empty, unsorted, contain duplicates, and intervals may overlap, nest, or touch.

## Output

Return a list of tuples `(start, end, priority)` such that:

1. A time point `t` is covered by the output iff it is covered by at least one
   input interval. Gaps in coverage must be preserved as gaps.
2. Each output segment carries the priority of the highest-priority input
   interval covering it (higher number = higher priority).
3. Output segments are non-overlapping, sorted by `start`.
4. Adjacent output segments (where one ends exactly where the next starts) with
   the SAME priority must be merged into a single segment — even if they came
   from different input intervals.
5. No zero-length segments.

## Examples

- `resolve_schedule([(0, 10, 1), (3, 6, 5)])` → `[(0, 3, 1), (3, 6, 5), (6, 10, 1)]`
- `resolve_schedule([(1, 3, 2), (3, 6, 2)])` → `[(1, 6, 2)]`
- `resolve_schedule([])` → `[]`

## Requirements

- Pure Python 3 standard library only. No I/O, no prints.
- Respond with a SINGLE fenced python code block containing the complete
  function (plus any helpers). Keep prose outside the block to a minimum.
