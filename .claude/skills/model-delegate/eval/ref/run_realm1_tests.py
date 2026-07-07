"""Run the realm-1 test functions against candidate.py in cwd (no pytest needed).

Usage: cd <dir with candidate.py + test_realm1.py> && python3 run_realm1_tests.py
"""
import sys
import traceback

sys.path.insert(0, ".")
import test_realm1  # noqa: E402

tests = [getattr(test_realm1, n) for n in dir(test_realm1) if n.startswith("test_")]
passed = 0
for t in tests:
    try:
        t()
        passed += 1
        print(f"PASS {t.__name__}")
    except Exception:
        line = traceback.format_exc().strip().splitlines()[-1]
        print(f"FAIL {t.__name__}: {line[:120]}")
print(f"SCORE {passed}/{len(tests)}")
