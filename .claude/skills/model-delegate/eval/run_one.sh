#!/usr/bin/env bash
# Usage: run_one.sh <model-suffix> <slug> <realm-number> [timeout-seconds]
set -uo pipefail

if (($# < 3 || $# > 4)); then
  printf 'Usage: %s <model-suffix> <slug> <realm-number> [timeout-seconds]\n' "$0" >&2
  exit 2
fi

MODEL=$1
SLUG=$2
REALM=$3
TIMEOUT_SECONDS=${4:-1200}

[[ $MODEL =~ ^[A-Za-z0-9._-]+$ ]] || { printf 'Invalid model suffix: %s\n' "$MODEL" >&2; exit 2; }
[[ $SLUG =~ ^[A-Za-z0-9._-]+$ ]] || { printf 'Invalid slug: %s\n' "$SLUG" >&2; exit 2; }
[[ $REALM =~ ^[1-8]$ ]] || { printf 'Realm must be an integer from 1 through 8.\n' >&2; exit 2; }
[[ $TIMEOUT_SECONDS =~ ^[1-9][0-9]*$ ]] || { printf 'Timeout must be a positive integer.\n' >&2; exit 2; }

WS=$(cd "$(dirname "$0")" && pwd)
PROMPT="$WS/prompts/realm${REALM}.md"
OUT_DIR="$WS/out"
OUT="$OUT_DIR/r${REALM}-${SLUG}.md"
ERR="$OUT_DIR/r${REALM}-${SLUG}.stderr"
META="$OUT_DIR/r${REALM}-${SLUG}.meta"

[[ -f $PROMPT ]] || { printf 'Missing prompt: %s\n' "$PROMPT" >&2; exit 1; }
mkdir -p "$OUT_DIR"
: >"$OUT"
: >"$ERR"

START=$(date +%s%3N)
timeout --signal=TERM --kill-after=5s "${TIMEOUT_SECONDS}s" \
  opencode run --model "lazer/${MODEL}" --variant high --format default \
  --file "$PROMPT" \
  "Follow the attached UTF-8 prompt exactly and return only the requested text." \
  >"$OUT" 2>"$ERR"
RC=$?
END=$(date +%s%3N)
BYTES=$(wc -c <"$OUT")
printf 'ms=%d rc=%d bytes=%d timeout_seconds=%d\n' \
  "$((END - START))" "$RC" "$BYTES" "$TIMEOUT_SECONDS" >"$META"

if ((RC != 0)); then
  printf 'Model run failed (rc=%d). Stderr saved at %s\n' "$RC" "$ERR" >&2
  while IFS= read -r line; do
    printf '%s\n' "$line" >&2
  done <"$ERR"
fi

exit "$RC"
