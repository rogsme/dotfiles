# Design exercise: mini spreadsheet engine

This is an open-ended design + implementation exercise. There are many valid
architectures; you will be judged on your PLAN, your CODE, and how well your
design decisions hold up — not on matching a hidden reference.

## The task

Build an in-memory spreadsheet engine in Python 3 (stdlib only).

Public API (fixed, so it can be exercised):

```python
class Spreadsheet:
    def set(self, ref: str, text: str) -> None: ...
    def value(self, ref: str): ...
```

- `ref` is a cell reference like `"A1"`, `"BC23"` (letters = column, digits = row).
- `text` is either a number literal (`"42"`, `"-3.5"`) or a formula starting
  with `=`, e.g. `"=A1+B2*2"`, `"=(A1+1)/A3"`, `"=SUM(A1:B3)"`.
- Formula grammar: numbers, cell refs, `+ - * /`, unary minus, parentheses,
  and `SUM(<ref>:<ref>)` over a rectangular range.
- `value(ref)` returns:
  - `float` for a clean evaluation (empty cells referenced by formulas count
    as 0.0; an unset cell itself evaluates to 0.0),
  - the string `"#CYCLE!"` for any cell on or depending on a circular
    reference,
  - the string `"#ERR!"` for division by zero, malformed formulas, or a
    formula that references a `#ERR!` cell. (`#CYCLE!` wins over `#ERR!` when
    both apply.)
- Cells can be overwritten at any time; consequences must propagate (e.g.
  fixing a cell that caused a cycle heals all affected cells).
- It must stay fast for chains/fan-outs of a few thousand cells when one
  upstream cell changes.

## Required response format (three sections)

### 1. PLAN
Your architecture BEFORE the code: chosen data structures, evaluation/
recomputation strategy (eager vs lazy, dirty marking, topological order...),
how cycles are detected and healed, invariants you maintain, and at least one
alternative you considered and why you rejected it. Be concrete, ~300 words.

### 2. IMPLEMENTATION
One fenced python code block containing the complete engine.

### 3. SELF-TESTS
A second fenced python code block with executable asserts demonstrating the
edge cases you consider most important (it will be run with your engine
importable; end it with `print("SELF-TESTS PASSED")`).
