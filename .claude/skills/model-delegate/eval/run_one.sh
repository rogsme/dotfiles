#!/usr/bin/env bash
# usage: run_one.sh <model-suffix> <slug> <realm-number>
set -u
WS="$(cd "$(dirname "$0")" && pwd)"
MODEL="$1"; SLUG="$2"; REALM="$3"
PROMPT="$WS/prompts/realm${REALM}.md"
OUT="$WS/out/r${REALM}-${SLUG}.md"
META="$WS/out/r${REALM}-${SLUG}.meta"
START=$(date +%s%3N)
opencode run -m "lazer/${MODEL}" --variant high "$(cat "$PROMPT")" 2>/dev/null > "$OUT"
RC=$?
END=$(date +%s%3N)
echo "ms=$((END-START)) rc=$RC bytes=$(wc -c < "$OUT")" > "$META"
