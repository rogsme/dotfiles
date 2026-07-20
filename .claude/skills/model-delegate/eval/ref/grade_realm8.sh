#!/usr/bin/env bash
# Usage: grade_realm8.sh <slug>
set -uo pipefail

if (($# != 1)); then
  printf 'Usage: %s <slug>\n' "$0" >&2
  exit 2
fi

slug=$1
[[ $slug =~ ^[A-Za-z0-9._-]+$ ]] || { printf 'Invalid slug: %s\n' "$slug" >&2; exit 2; }

WS=$(cd "$(dirname "$0")/.." && pwd)
OUT="$WS/out/r8-$slug.md"
META="$WS/out/r8-$slug.meta"
d="$WS/work/r8-$slug"
candidate="$d/candidate.py"
selftest_body="$d/selftest_body.py"
battery_log="$d/battery.log"
selftest_log="$d/selftest.log"

[[ -f $OUT ]] || { printf 'Missing model output: %s\n' "$OUT" >&2; exit 1; }
mkdir -p "$d"

if ! python3 "$WS/ref/extract_code.py" "$OUT" "class Spreadsheet" >"$candidate"; then
  printf 'NO IMPL BLOCK\n' >&2
  exit 1
fi

selftest_extract_rc=0
python3 "$WS/ref/extract_code.py" "$OUT" "SELF-TESTS PASSED" >"$selftest_body" || selftest_extract_rc=$?
{
  printf '%s\n' 'import candidate as _c, sys'
  printf '%s\n' "for _n in ('spreadsheet','engine','sheet','mini_spreadsheet'): sys.modules[_n]=_c"
  printf '%s\n' 'from candidate import *'
  if ((selftest_extract_rc == 0)); then
    while IFS= read -r line; do
      printf '%s\n' "$line"
    done <"$selftest_body"
  else
    printf '%s\n' 'raise RuntimeError("candidate self-tests were not found")'
  fi
} >"$d/selftest.py"

cp -f "$WS/ref/realm8_battery.py" "$d/"

printf '%s\n' '--- battery'
(
  cd "$d" || exit 1
  timeout --signal=TERM --kill-after=5s 120s python3 realm8_battery.py
) >"$battery_log" 2>&1
battery_rc=$?
tail -n 13 "$battery_log"

printf '%s\n' '--- self-tests'
(
  cd "$d" || exit 1
  timeout --signal=TERM --kill-after=5s 120s python3 selftest.py
) >"$selftest_log" 2>&1
selftest_rc=$?
tail -n 3 "$selftest_log"

if [[ -f $META ]]; then
  while IFS= read -r line; do
    printf '%s\n' "--- meta: $line"
  done <"$META"
fi

if ((battery_rc != 0 || selftest_rc != 0 || selftest_extract_rc != 0)); then
  exit 1
fi
