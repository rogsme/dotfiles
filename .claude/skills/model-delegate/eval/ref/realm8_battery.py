"""Behavioral battery for realm-8 spreadsheet engines.

Usage: cd <dir with candidate.py defining Spreadsheet> && python3 realm8_battery.py
Prints one PASS/FAIL line per check + timing for the perf probe.
"""
import sys
import time

sys.path.insert(0, ".")
from candidate import Spreadsheet  # noqa: E402

checks = []


def check(name, fn):
    try:
        ok, detail = fn()
    except Exception as e:
        ok, detail = False, f"EXC {type(e).__name__}: {e}"
    checks.append((name, ok, detail))


def close(a, b):
    return isinstance(a, float) and abs(a - b) < 1e-9


def basics():
    s = Spreadsheet()
    s.set("A1", "2")
    s.set("A2", "-3.5")
    s.set("A3", "=A1+A2*2")
    return close(s.value("A3"), -5.0), s.value("A3")


def empty_cells():
    s = Spreadsheet()
    s.set("B1", "=Z99+1")
    return close(s.value("B1"), 1.0) and close(s.value("Q7"), 0.0), (s.value("B1"), s.value("Q7"))


def propagation():
    s = Spreadsheet()
    s.set("A1", "1")
    s.set("A2", "=A1*10")
    s.set("A3", "=A2+A1")
    before = s.value("A3")
    s.set("A1", "5")
    return close(before, 11.0) and close(s.value("A3"), 55.0), (before, s.value("A3"))


def sum_range():
    s = Spreadsheet()
    for r in (1, 2, 3):
        s.set(f"A{r}", str(r))
        s.set(f"B{r}", str(r * 10))
    s.set("C1", "=SUM(A1:B3)")
    return close(s.value("C1"), 66.0), s.value("C1")


def cycle_detect_and_heal():
    s = Spreadsheet()
    s.set("A1", "=B1+1")
    s.set("B1", "=A1+1")
    s.set("C1", "=A1*2")
    cy = s.value("A1") == "#CYCLE!" and s.value("C1") == "#CYCLE!"
    s.set("B1", "7")
    healed = close(s.value("A1"), 8.0) and close(s.value("C1"), 16.0)
    return cy and healed, (s.value("A1"), s.value("C1"))


def self_cycle():
    s = Spreadsheet()
    s.set("A1", "=A1")
    return s.value("A1") == "#CYCLE!", s.value("A1")


def div_zero_and_error_prop():
    s = Spreadsheet()
    s.set("A1", "=1/0")
    s.set("A2", "=A1+1")
    return s.value("A1") == "#ERR!" and s.value("A2") == "#ERR!", (s.value("A1"), s.value("A2"))


def malformed():
    s = Spreadsheet()
    s.set("A1", "=1++")
    s.set("A2", "=)A1(")
    return s.value("A1") == "#ERR!" and s.value("A2") == "#ERR!", (s.value("A1"), s.value("A2"))


def cycle_beats_err():
    s = Spreadsheet()
    s.set("A1", "=A2/0")
    s.set("A2", "=A1")
    return s.value("A1") == "#CYCLE!", s.value("A1")


def overwrite_formula_with_literal():
    s = Spreadsheet()
    s.set("A1", "=B1+1")
    s.set("B1", "2")
    v1 = s.value("A1")
    s.set("A1", "9")
    return close(v1, 3.0) and close(s.value("A1"), 9.0), (v1, s.value("A1"))


def perf_chain():
    s = Spreadsheet()
    n = 2000
    s.set("A1", "1")
    for i in range(2, n + 1):
        s.set(f"A{i}", f"=A{i-1}+1")
    t0 = time.time()
    v_end = s.value(f"A{n}")
    s.set("A1", "100")
    v2 = s.value(f"A{n}")
    dt = time.time() - t0
    ok = close(v_end, float(n)) and close(v2, float(n) + 99.0) and dt < 10.0
    return ok, f"end={v_end} after_update={v2} dt={dt:.2f}s"


for f in (basics, empty_cells, propagation, sum_range, cycle_detect_and_heal,
          self_cycle, div_zero_and_error_prop, malformed, cycle_beats_err,
          overwrite_formula_with_literal, perf_chain):
    check(f.__name__, f)

passed = sum(1 for _, ok, _ in checks if ok)
for name, ok, detail in checks:
    print(f"{'PASS' if ok else 'FAIL'} {name}" + ("" if ok else f"  [{detail}]"))
print(f"SCORE {passed}/{len(checks)}")
