"""Run realm-6 vectors against candidate.py's next_fire in cwd."""
import sys

sys.path.insert(0, ".")
from realm6_vectors import CASES  # noqa: E402
from candidate import next_fire  # noqa: E402

passed = 0
for expr, after, expected in CASES:
    try:
        got = next_fire(expr, after)
        ok = got == expected
    except Exception as e:
        got, ok = f"EXC {type(e).__name__}: {e}", False
    if ok:
        passed += 1
    else:
        print(f"FAIL {expr!r} after {after} -> {got} (want {expected})")
print(f"SCORE {passed}/{len(CASES)}")
