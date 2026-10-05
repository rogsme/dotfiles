#!/usr/bin/env bash
# Replay past EOD days through the EOD agent. See README.md for the case format.
#
#   run.sh <client repo checkout> [review|solo] [case ...]
#
#   review  EOD drafts, eod-review writes "Before you send"  (default)
#   solo    EOD does everything, no reviewer subagent
#
# Cases are private (real client notes), so they live outside this skill:
#   $EOD_EVAL_CASES   default ~/.eod/evals/cases
# Each run uses a scratch log root in /tmp/eod-eval/<case>/, never ~/.eod.
# Results land in ~/.eod/evals/results/<timestamp>-<variant>/.
set -euo pipefail

REPO=${1:?usage: run.sh <client repo checkout> [review|solo] [case ...]}
VARIANT=${2:-review}
shift $(( $# >= 2 ? 2 : 1 ))
case "$VARIANT" in review|solo) ;; *) echo "variant must be review or solo" >&2; exit 2;; esac

CASES=${EOD_EVAL_CASES:-$HOME/.eod/evals/cases}
[ -d "$CASES" ] || { echo "no cases at $CASES (set EOD_EVAL_CASES)" >&2; exit 2; }
OUT="$HOME/.eod/evals/results/$(date +%Y%m%d-%H%M)-$VARIANT"
mkdir -p "$OUT"

if [ $# -gt 0 ]; then cases=("$@"); else mapfile -t cases < <(ls "$CASES"); fi

for c in "${cases[@]}"; do
  d="$CASES/$c"
  [ -d "$d" ] || { echo "no such case: $c" >&2; continue; }
  TODAY=""; YESTERDAY=""; CLIENT=""
  # shellcheck disable=SC1091
  source "$d/case.env"
  [ -n "$CLIENT" ] || { echo "$c: case.env needs CLIENT" >&2; continue; }

  cfg="$d/client.md"
  [ -f "$cfg" ] || cfg="$HOME/.eod/$CLIENT/client.md"
  [ -f "$cfg" ] || { echo "$c: no client config ($d/client.md or ~/.eod/$CLIENT/client.md)" >&2; continue; }

  root="/tmp/eod-eval/$c"
  rm -rf "$root"
  mkdir -p "$root/$CLIENT"
  cp "$cfg" "$root/$CLIENT/client.md"
  if [ -n "$YESTERDAY" ] && [ -f "$d/yesterday.md" ]; then
    cp "$d/yesterday.md" "$root/$CLIENT/$YESTERDAY.md"
  fi

  if [ "$VARIANT" = solo ]; then
    reviewer="- Do not call the eod-review subagent. Write the \"Before you send\" flags yourself using references/review.md."
  else
    reviewer="- Use the eod-review subagent for the \"Before you send\" flags, as the skill says."
  fi

  prompt="EVAL MODE (a replay of a past day, not a real one):
- Today is $TODAY. Ignore the system clock and the date check against it; still check the stated date in the notes against $TODAY.
- The log root is $root/ instead of ~/.eod/. Read and write only there. The client is $CLIENT.
- PRs have moved on since this day. Use gh pr view for descriptions and risks, but take the PR states stated in the notes as true. Do not run todays_prs.py: today is in the past, so use only the PRs listed in the notes.
$reviewer
- Mode: daily client EOD.

The notes:

$(cat "$d/notes.md")"

  echo "== $c ($VARIANT)"
  if ! opencode run --agent EOD --dir "$REPO" --title "eod-eval $c $VARIANT" "$prompt" > "$OUT/$c.md" 2>&1; then
    echo "   opencode exited non-zero, see $OUT/$c.md" >&2
  fi
  cp -r "$root" "$OUT/$c-logs"
done

[ -f "$CASES/../scorecard.md" ] && cp "$CASES/../scorecard.md" "$OUT/scorecard.md"
echo "Done. Transcripts and logs in $OUT."
