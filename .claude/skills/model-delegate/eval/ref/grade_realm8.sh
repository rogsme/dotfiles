#!/usr/bin/env bash
# usage: grade_realm8.sh <slug>
set -u
WS="$(cd "$(dirname "$0")/.." && pwd)"
slug="$1"; d="$WS/work/r8-$slug"; mkdir -p "$d"
python3 "$WS/ref/extract_code.py" "$WS/out/r8-$slug.md" "class Spreadsheet" > "$d/candidate.py" || { echo "NO IMPL BLOCK"; exit 0; }
{ echo "import candidate as _c, sys"
  echo "for _n in ('spreadsheet','engine','sheet','mini_spreadsheet'): sys.modules[_n]=_c"
  echo "from candidate import *"
  python3 "$WS/ref/extract_code.py" "$WS/out/r8-$slug.md" "SELF-TESTS PASSED"
} > "$d/selftest.py" 2>/dev/null
cp -f "$WS/ref/realm8_battery.py" "$d/"
echo "--- battery"
(cd "$d" && timeout 120 python3 realm8_battery.py 2>&1 | tail -13)
echo "--- self-tests"
(cd "$d" && timeout 120 python3 selftest.py 2>&1 | tail -3)
grep -c . "$WS/out/r8-$slug.md" >/dev/null && echo "--- meta: $(cat "$WS/out/r8-$slug.meta" 2>/dev/null)"
