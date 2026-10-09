#!/usr/bin/env bash
# Replay past EOD days through the EOD agent. See README.md for the case format.
#
#   run.sh <client repo checkout> [review|solo] [case ...]
#
#   review  EOD drafts, eod-review and eod-reader write "Before you send"  (default)
#   solo    EOD does everything, no reviewer subagents
#
# Cases are private (real client notes), so they live outside this skill:
#   $EOD_EVAL_CASES   default ~/.eod/evals/cases
# Each run uses a scratch log root in /tmp/eod-eval/<case>/, never ~/.eod.
# Results land in ~/.eod/evals/results/<timestamp>-<variant>/.
# Each case is killed after $EOD_EVAL_TIMEOUT seconds (default 1200).
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
  day="${TODAY##* }"
  if [ -f "$d/prs.json" ]; then
    cp "$d/prs.json" "$root/$CLIENT/$day.prs.json"
    prs="- The PR inventory is $root/$CLIENT/$day.prs.json, with states as of that day. Use it as the gather output (it may include PRs the notes don't mention) and pass it to the checker with --prs."
  else
    prs="- There is no PR inventory for this case. Run the checker without --prs and check by hand that every merged, opened or worked-on PR in the notes appears with its number."
  fi
  if [ -f "$d/tickets.json" ]; then
    cp "$d/tickets.json" "$root/$CLIENT/$day.tickets.json"
    tickets="- The ticket pass output is $root/$CLIENT/$day.tickets.json, as of that day. Use it instead of calling the tracker."
  else
    tickets="- Skip the ticket pass and do not call the tracker: its data has moved on since this day."
  fi
  facts="- Use gh pr view for descriptions and risks, but take PR states from the case (inventory or notes) as true."
  if [ -f "$d/pr-facts.md" ]; then
    cp "$d/pr-facts.md" "$root/$CLIENT/$day.pr-facts.md"
    facts="- PR descriptions and risks are frozen at $root/$CLIENT/$day.pr-facts.md. Use them instead of gh pr view; do not fetch live PR data."
  fi

  if [ "$VARIANT" = solo ]; then
    reviewer="- Skip the eod-review and eod-reader subagents. Write the \"Before you send\" flags yourself using references/review.md and label them as a solo review."
  else
    reviewer="- Run the eod-review and eod-reader subagents as the skill says."
  fi

  prompt="EVAL MODE (a replay of a past day, not a real one):
- Today is $TODAY. Ignore the system clock and the date check against it; still check the stated date in the notes against $TODAY.
- The log root is $root/ instead of ~/.eod/. Read and write only there; previews in /tmp/opencode are the one exception. Start with eod_context.py --root $root. The client is $CLIENT.
- PRs have moved on since this day. Do not run todays_prs.py: today is in the past.
$facts
$prs
$tickets
$reviewer
- Render the preview with --no-open.
- Nobody can answer questions during this run. Where the skill says to ask Roger, make your best call, keep going, and list the question in \"Before you send\".
- Mode: daily client EOD.

The notes:

$(cat "$d/notes.md")"

  echo "== $c ($VARIANT)"
  # opencode v2 has no --dir: run from the checkout, with a private server so
  # the session uses this directory instead of the background service's.
  if ! (cd "$REPO" && timeout "${EOD_EVAL_TIMEOUT:-1200}" opencode run --standalone --agent EOD --title "eod-eval $c $VARIANT" "$prompt") > "$OUT/$c.md" 2>&1; then
    echo "   opencode exited non-zero, see $OUT/$c.md" >&2
  fi
  cp -r "$root" "$OUT/$c-logs"
done

[ -f "$CASES/../scorecard.md" ] && cp "$CASES/../scorecard.md" "$OUT/scorecard.md"
echo "Done. Transcripts and logs in $OUT."
