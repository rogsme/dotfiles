"""Grade a realm-7 candidate. Usage: cd <dir with candidate.py> && python3 grade_realm7.py

Q1 fuzzed against re.fullmatch, Q2 against eval (on generated-safe inputs),
Q3 against a reference simulator. Per-case 5s watchdog so hangs cost one case,
not the run.
"""
import math
import random
import re
import signal
import sys
from collections import OrderedDict

sys.path.insert(0, ".")
import candidate  # noqa: E402


class Timeout(Exception):
    pass


def _alarm(sig, frame):
    raise Timeout()


signal.signal(signal.SIGALRM, _alarm)


def guarded(fn, *args):
    signal.alarm(5)
    try:
        return fn(*args)
    finally:
        signal.alarm(0)


# ---------------- Q1: regex ----------------
def gen_pattern(rng):
    metas = ".*+?[]\\"
    atoms = []
    for _ in range(rng.randint(1, 6)):
        kind = rng.random()
        if kind < 0.35:
            a = rng.choice("abcd")
        elif kind < 0.5:
            a = "."
        elif kind < 0.62:
            a = "\\" + rng.choice(metas)
        else:
            neg = "^" if rng.random() < 0.4 else ""
            items = []
            for _ in range(rng.randint(1, 3)):
                if rng.random() < 0.5:
                    lo = rng.choice("abcd")
                    items.append(f"{lo}-{chr(ord(lo) + rng.randint(0, 3))}")
                else:
                    items.append(rng.choice("abcdxyz"))
            a = "[" + neg + "".join(items) + "]"
        if rng.random() < 0.45:
            a += rng.choice("*+?")
        atoms.append(a)
    return "".join(atoms)


def q1():
    rng = random.Random(42)
    targeted = [
        ("a*a", "aaa"), ("a*a", ""), ("a*a*a*b", "aaaaaaaaaab"), ("a*a*a*b", "aaaaaaaaaa"),
        ("[^ab]?c", "c"), ("[^ab]?c", "xc"), ("[^ab]?c", "ac"), ("\\*+", "***"),
        ("\\\\.", "\\x"), ("[a-c]+d?", "abccba"), ("[a-c]+d?", "abcd"), (".", ""),
        ("a?a?a?aaa", "aaa"), ("[0-9]*", ""), ("x", "x"),
    ]
    cases = list(targeted)
    for _ in range(1500):
        p = gen_pattern(rng)
        s = "".join(rng.choice("abcdxy\\*") for _ in range(rng.randint(0, 12)))
        cases.append((p, s))
    passed = failed = errs = 0
    first_fails = []
    for p, s in cases:
        want = re.fullmatch(p, s, re.S) is not None
        try:
            got = bool(guarded(candidate.regex_match, p, s))
        except Exception as e:
            errs += 1
            got = f"EXC {type(e).__name__}"
        if got is want:
            passed += 1
        else:
            failed += 1
            if len(first_fails) < 5:
                first_fails.append((p, s, want, got))
    return passed, len(cases), first_fails


# ---------------- Q2: evaluator ----------------
def gen_expr(rng, depth=0):
    r = rng.random()
    if depth > 3 or r < 0.35:
        if rng.random() < 0.3:
            return f"{rng.randint(0, 9)}.{rng.randint(0, 99)}"
        return str(rng.randint(0, 9))
    if r < 0.45:
        return "-" + gen_expr(rng, depth + 1)
    if r < 0.6:
        return "( " + gen_expr(rng, depth + 1) + " )"
    op = rng.choice(["+", "-", "*", "/", "%", "**"])
    return gen_expr(rng, depth + 1) + f" {op} " + gen_expr(rng, depth + 1)


def q2():
    rng = random.Random(7)
    targeted_valid = [
        "-2**2", "2**-1", "2**3**2", "--3", "2--3", "2*-3", "-3%5", "7 % 2.5",
        "2 ** -3", "-(2+3)*4", "1.5*(2-4.25)/2", "0.1+0.2",
    ]
    malformed = ["", "2 +", "(1+2", "1 2", "*3", "2**", "1..2", "()", "+3", "2 + +3", "abc", "4)("]
    cases = []
    for e in targeted_valid:
        cases.append((e, eval(e)))
    tries = 0
    while len(cases) < 12 + 500 and tries < 20000:
        tries += 1
        e = gen_expr(rng)
        try:
            v = eval(e)
        except Exception:
            continue
        try:
            if isinstance(v, complex) or not math.isfinite(float(v)) or abs(v) > 1e12:
                continue
        except OverflowError:
            continue
        cases.append((e, v))
    passed = failed = 0
    first_fails = []
    for e, want in cases:
        try:
            got = guarded(candidate.evaluate, e)
            ok = isinstance(got, (int, float)) and not isinstance(got, bool) \
                and math.isclose(float(got), float(want), rel_tol=1e-9, abs_tol=1e-9)
        except Exception:
            ok, got = False, "EXC"
        if ok:
            passed += 1
        else:
            failed += 1
            if len(first_fails) < 5:
                first_fails.append((e, want, got))
    total = len(cases) + len(malformed)
    for e in malformed:
        try:
            got = guarded(candidate.evaluate, e)
            failed += 1
            if len(first_fails) < 5:
                first_fails.append((e, "ValueError", got))
        except ValueError:
            passed += 1
        except Exception as ex:
            failed += 1
            if len(first_fails) < 5:
                first_fails.append((e, "ValueError", f"raised {type(ex).__name__}"))
    return passed, total, first_fails


# ---------------- Q3: cache ----------------
class RefCache:
    def __init__(self, cap):
        self.cap = cap
        self.od = OrderedDict()

    def _purge(self, now):
        for k in [k for k, (v, e) in self.od.items() if e is not None and now >= e]:
            del self.od[k]

    def _size(self):
        return sum(len(k.encode()) + len(v) for k, (v, e) in self.od.items())

    def set(self, key, value, ttl, now):
        self.od.pop(key, None)
        if len(key.encode()) + len(value) > self.cap:
            return
        self.od[key] = (value, None if ttl is None else now + ttl)
        if self._size() > self.cap:
            self._purge(now)
        while self._size() > self.cap:
            self.od.popitem(last=False)

    def get(self, key, now):
        item = self.od.get(key)
        if item is None:
            return None
        v, e = item
        if e is not None and now >= e:
            del self.od[key]
            return None
        self.od.move_to_end(key)
        return v

    def size(self, now):
        self._purge(now)
        return self._size()


def q3():
    rng = random.Random(99)
    targeted_ok, targeted_n = 0, 0

    def run_seq(cap, ops):
        ref, cand = RefCache(cap), candidate.ByteCache(cap)
        for op in ops:
            if op[0] == "set":
                _, k, v, ttl, now = op
                guarded(cand.set, k, v, ttl, now)
                ref.set(k, v, ttl, now)
            elif op[0] == "get":
                _, k, now = op
                if guarded(cand.get, k, now) != ref.get(k, now):
                    return False, op
            else:
                _, now = op
                if guarded(cand.size, now) != ref.size(now):
                    return False, op
        return True, None

    # targeted sequences
    seqs = [
        (10, [("set", "a", b"12345", None, 0), ("set", "b", b"1234", None, 1),
              ("get", "a", 2), ("set", "c", b"123", None, 3), ("get", "a", 4),
              ("get", "b", 4), ("size", 4)]),                      # LRU order after get-refresh
        (10, [("set", "a", b"123", 5, 0), ("get", "a", 4), ("get", "a", 5),
              ("size", 5)]),                                       # expiry boundary now >= t+ttl
        (10, [("set", "a", b"0123456789abc", None, 0), ("size", 0),
              ("set", "a", b"12", None, 1), ("get", "a", 1)]),     # too-big entry stored nothing
        (10, [("set", "a", b"1234", None, 0), ("set", "a", b"123456789", None, 1),
              ("size", 1), ("get", "a", 1)]),                      # replace removes old first
        (12, [("set", "a", b"1234", 2, 0), ("set", "b", b"1234", None, 1),
              ("set", "c", b"1234", None, 3), ("get", "b", 3), ("size", 3)]),  # purge expired before LRU evict
    ]
    fails = []
    for cap, ops in seqs:
        targeted_n += 1
        try:
            ok, bad = run_seq(cap, ops)
        except Exception as e:
            ok, bad = False, f"EXC {type(e).__name__}: {e}"
        if ok:
            targeted_ok += 1
        elif len(fails) < 5:
            fails.append(("targeted", bad))

    fuzz_ok, fuzz_n = 0, 0
    for _ in range(40):
        fuzz_n += 1
        cap = rng.randint(16, 80)
        now = 0
        ops = []
        keys = ["k%d" % i for i in range(6)]
        for _ in range(60):
            now += rng.randint(0, 4)
            r = rng.random()
            if r < 0.5:
                ops.append(("set", rng.choice(keys), bytes(rng.randint(0, 40)),
                            rng.choice([None, rng.randint(1, 15)]), now))
            elif r < 0.85:
                ops.append(("get", rng.choice(keys), now))
            else:
                ops.append(("size", now))
        try:
            ok, bad = run_seq(cap, ops)
        except Exception as e:
            ok, bad = False, f"EXC {type(e).__name__}: {e}"
        if ok:
            fuzz_ok += 1
        elif len(fails) < 5:
            fails.append(("fuzz", bad))
    return targeted_ok + fuzz_ok, targeted_n + fuzz_n, fails


all_passed = True
for name, fn in (("Q1_regex", q1), ("Q2_eval", q2), ("Q3_cache", q3)):
    try:
        p, n, ff = fn()
        print(f"{name} {p}/{n}" + (f"  first_fails={ff}" if ff else ""))
        all_passed = all_passed and p == n
    except Exception as e:
        print(f"{name} HARNESS_ERROR {type(e).__name__}: {e}")
        all_passed = False

sys.exit(0 if all_passed else 1)
