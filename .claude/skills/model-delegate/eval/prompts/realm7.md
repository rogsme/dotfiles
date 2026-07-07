# Coding exam — 3 problems, one answer block

Solve ALL THREE problems below. Respond with a SINGLE fenced python code block
containing `regex_match`, `evaluate`, and `ByteCache`. No prose outside the
block. Python 3 standard library only. Grading is mechanical and edge-case
heavy: exact behavioral compliance with each spec is what counts.

---

## Problem 1 — `regex_match(pattern: str, s: str) -> bool`

Return True iff the ENTIRE string `s` matches `pattern` (fullmatch semantics).
You may NOT use the `re` module or any regex library.

Pattern grammar:

- Literal characters: any character except the metacharacters `. * + ? [ ] \`
- `\x` where `x` is a metacharacter — matches literal `x`.
- `.` — matches any single character.
- Character class `[...]`: matches one character from the set. A leading `^`
  negates the set. Items are single characters or ranges like `a-z`. Inside a
  class, characters are literal (no escapes, no `]` or `\` will appear as
  members; ranges are well-formed, e.g. `[a-c x-z0-9]` style sets).
- Quantifiers `*` (0+), `+` (1+), `?` (0 or 1) apply to the immediately
  preceding atom (literal, escaped char, `.`, or class). A quantifier never
  appears at the start of a pattern or after another quantifier.
- No groups, no alternation, no anchors. Patterns are guaranteed valid.

Matching must be exact — e.g. `a*a` matches `"aaa"`, `[^ab]?c` matches `"c"`
and `"xc"` but not `"ac"`. Watch out for backtracking correctness; inputs are
small (strings ≤ 20 chars) but chains like `a*a*a*b` must work.

---

## Problem 2 — `evaluate(expr: str) -> float`

Evaluate an arithmetic expression string and return the numeric result.
You may NOT use `eval`, `exec`, `ast`, or `compile`.

- Numbers: non-negative integer or decimal literals (`3`, `4.25`). No
  scientific notation, no leading `+`.
- Operators: binary `+ - * / %` and `**`, unary minus, parentheses, arbitrary
  whitespace anywhere between tokens.
- Precedence and associativity must match Python exactly:
  1. parentheses
  2. `**` — RIGHT-associative; its right operand may carry unary minus
     (`2**-1` == 0.5, `2**3**2` == 512)
  3. unary `-` — stackable (`--3` == 3); binds looser than `**`
     (`-2**2` == -4) but tighter than `*`
  4. `* / %` — left-associative (Python float semantics for `/` and `%`)
  5. binary `+ -` — left-associative
- Malformed input (empty, dangling operators, unbalanced parens, adjacent
  numbers, unknown characters, unary `+`, etc.) must raise `ValueError`.
  Valid test inputs never divide or mod by zero.

---

## Problem 3 — `class ByteCache`

A byte-budgeted LRU cache with per-entry TTL and an explicit logical clock
(no wall-clock reads; `now` is a non-decreasing integer passed in).

```python
class ByteCache:
    def __init__(self, capacity_bytes: int): ...
    def set(self, key: str, value: bytes, ttl: int | None, now: int) -> None: ...
    def get(self, key: str, now: int) -> bytes | None: ...
    def size(self, now: int) -> int: ...
```

Rules:

- Entry size = `len(key.encode("utf-8")) + len(value)`. An entry set at time
  `t` with integer `ttl` is expired for any `now >= t + ttl`; `ttl=None` never
  expires. Expired entries are dead: never returnable, never counted.
- `get`: return the value and refresh the entry's recency (make it
  most-recently-used) ONLY on a live hit. If the key is missing, return None.
  If the entry is expired, remove it and return None (no recency effect).
- `set`: always removes any existing entry for `key` first. If the new entry's
  size alone exceeds `capacity_bytes`, store nothing (the old entry stays
  removed). Otherwise insert it as most-recently-used with the new ttl. Then,
  if total live size exceeds capacity: FIRST remove all expired entries; if
  still over capacity, evict least-recently-used live entries one by one until
  total size fits. `set` counts as a "use" (the new entry is MRU).
- `size(now)`: total bytes of live entries (expired entries must not be
  counted, and should be pruned).

Determinism matters: two correct implementations must agree on every
observable result (`get` returns and `size` values) for any op sequence.
