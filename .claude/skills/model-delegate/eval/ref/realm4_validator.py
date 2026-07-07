"""Validate a model's realm-4 output against the strict incident schema.

Usage: python3 realm4_validator.py <output_file>
Prints one PASS/FAIL line per check plus a final score line.
"""
import json
import re
import sys

EXPECTED_KEY_ORDER = [
    "id", "title", "severity", "started_at", "resolved_at",
    "duration_minutes", "impact_pct", "services", "oncall", "summary",
]

raw = open(sys.argv[1]).read()
checks = []


def check(name, ok, detail=""):
    checks.append((name, bool(ok), detail))


stripped = raw.strip()
# raw JSON only: must not be wrapped in fences or contain prose
check("raw_json_no_fences", stripped.startswith("{") and stripped.endswith("}"),
      "output must be a bare JSON object")

# tolerate fences for the remaining checks so we can grade partial credit
m = re.search(r"\{.*\}", raw, re.S)
data, pairs = None, None
if m:
    try:
        data = json.loads(m.group(0))
        pairs = json.loads(m.group(0), object_pairs_hook=lambda p: p)
    except json.JSONDecodeError:
        pass
check("parses_as_json", data is not None)

if data is None:
    for name, ok, detail in checks:
        print(f"{'PASS' if ok else 'FAIL'} {name} {detail}")
    print(f"SCORE 0/{len(EXPECTED_KEY_ORDER) + 2}")
    sys.exit(0)

keys = [k for k, _ in pairs]
check("key_order_exact", keys == EXPECTED_KEY_ORDER, f"got {keys}")
check("id", data.get("id") == "INC-20260703", f"got {data.get('id')!r}")
check("title_le_60", isinstance(data.get("title"), str) and 0 < len(data["title"]) <= 60,
      f"len={len(data.get('title') or '')}")
check("severity", data.get("severity") == "sev2", f"got {data.get('severity')!r}")
check("started_at", data.get("started_at") == "2026-07-03T19:47:00Z",
      f"got {data.get('started_at')!r}")
check("resolved_at", data.get("resolved_at") == "2026-07-03T20:35:00Z",
      f"got {data.get('resolved_at')!r}")
check("duration_minutes", data.get("duration_minutes") == 48,
      f"got {data.get('duration_minutes')!r}")
check("impact_pct", data.get("impact_pct") == 12, f"got {data.get('impact_pct')!r}")
check("services", data.get("services") == ["checkout-web", "payments-api"],
      f"got {data.get('services')!r}")
check("oncall", data.get("oncall") == "Maria", f"got {data.get('oncall')!r}")
summary = data.get("summary") or ""
check("summary_le_80_mentions_rollback",
      isinstance(summary, str) and len(summary) <= 80 and "rollback" in summary.lower(),
      f"len={len(summary)}")

passed = sum(1 for _, ok, _ in checks if ok)
for name, ok, detail in checks:
    print(f"{'PASS' if ok else 'FAIL'} {name}" + (f"  [{detail}]" if not ok and detail else ""))
print(f"SCORE {passed}/{len(checks)}")
