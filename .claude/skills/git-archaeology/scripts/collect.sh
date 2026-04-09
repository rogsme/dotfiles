#!/usr/bin/env bash
set -euo pipefail

# Git Archaeology — Data Collector
# Runs all diagnostic git commands and outputs structured text for agent analysis.
#
# Usage: collect.sh [--path <subdir>] [--since <period>] [--top <n>]
#   --path   Scope analysis to a subdirectory (monorepo support)
#   --since  Lookback period, e.g. "6 months ago", "2 years ago" (auto-detected by default, capped at 1 year)
#   --top    Number of entries in top-N lists (default: 20)
#   --help   Show this help message

# --- Defaults ---
SCOPE_PATH=""
SINCE=""
TOP=20

# --- Parse args ---
while [[ $# -gt 0 ]]; do
  case "$1" in
    --path)  SCOPE_PATH="$2"; shift 2 ;;
    --since) SINCE="$2"; shift 2 ;;
    --top)   TOP="$2"; shift 2 ;;
    --help)
      sed -n '3,9p' "$0"
      exit 0
      ;;
    *) echo "Unknown arg: $1" >&2; exit 1 ;;
  esac
done

# --- Validate we're in a git repo ---
if ! git rev-parse --is-inside-work-tree &>/dev/null; then
  echo "ERROR: Not inside a git repository." >&2
  exit 1
fi

REPO_ROOT="$(git rev-parse --show-toplevel)"

# --- Auto-detect timeframe ---
if [[ -z "$SINCE" ]]; then
  first_commit_epoch=$(git log --reverse --format='%at' | head -1)
  now_epoch=$(date +%s)
  age_days=$(( (now_epoch - first_commit_epoch) / 86400 ))

  if [[ $age_days -le 365 ]]; then
    # Project is younger than 1 year — use full history
    SINCE="${age_days} days ago"
    TIMEFRAME_NOTE="Full project history (${age_days} days)"
  else
    SINCE="1 year ago"
    TIMEFRAME_NOTE="Last 12 months (project is ~$(( age_days / 365 )) years old)"
  fi
else
  TIMEFRAME_NOTE="Custom: since ${SINCE}"
fi

# --- Scope setup ---
PATH_ARGS=""
LOG_PATH_ARGS=""
if [[ -n "$SCOPE_PATH" ]]; then
  PATH_ARGS="-- ${SCOPE_PATH}"
  LOG_PATH_ARGS="-- ${SCOPE_PATH}"
fi

# --- Helper ---
separator() {
  echo ""
  echo "======== $1 ========"
  echo ""
}

# --- Metadata ---
separator "METADATA"
echo "repo: $(basename "$REPO_ROOT")"
echo "analyzed: $(date -u '+%Y-%m-%d %H:%M UTC')"
echo "timeframe: ${TIMEFRAME_NOTE}"
echo "since: ${SINCE}"
echo "scope: ${SCOPE_PATH:-entire repository}"
echo "top_n: ${TOP}"
total_commits=$(git log --oneline --since="$SINCE" $LOG_PATH_ARGS 2>/dev/null | wc -l)
echo "total_commits_in_period: ${total_commits}"
total_contributors=$(git shortlog -sn --no-merges --since="$SINCE" $LOG_PATH_ARGS 2>/dev/null | wc -l)
echo "total_contributors_in_period: ${total_contributors}"

# --- 1. Churn Hotspots ---
separator "CHURN_HOTSPOTS"
echo "# Files most frequently modified (top ${TOP})"
git log --format=format: --name-only --since="$SINCE" $LOG_PATH_ARGS \
  | grep -v '^$' \
  | sort | uniq -c | sort -nr | head -"$TOP"

# --- 2. Contributors / Bus Factor ---
separator "CONTRIBUTORS_ALL_TIME"
echo "# All-time contributor ranking"
git shortlog -sn --no-merges $LOG_PATH_ARGS 2>/dev/null | head -"$TOP"

separator "CONTRIBUTORS_RECENT"
echo "# Contributors in analysis period"
git shortlog -sn --no-merges --since="$SINCE" $LOG_PATH_ARGS 2>/dev/null | head -"$TOP"

separator "CONTRIBUTORS_LAST_6_MONTHS"
echo "# Contributors in last 6 months"
git shortlog -sn --no-merges --since="6 months ago" $LOG_PATH_ARGS 2>/dev/null | head -"$TOP"

# --- 3. Bug Clusters ---
separator "BUG_CLUSTERS"
echo "# Files most associated with bug-fix commits (top ${TOP})"
git log -i -E --grep="fix|bug|broken|patch|issue|defect" --name-only --format='' --since="$SINCE" $LOG_PATH_ARGS \
  | grep -v '^$' \
  | sort | uniq -c | sort -nr | head -"$TOP"

# --- 4. Project Momentum ---
separator "MOMENTUM"
echo "# Commits per month"
git log --format='%ad' --date=format:'%Y-%m' --since="$SINCE" $LOG_PATH_ARGS \
  | sort | uniq -c | sort -k2

# --- 5. Firefighting ---
separator "FIREFIGHTING"
echo "# Reverts, hotfixes, emergencies, rollbacks"
git log --oneline --since="$SINCE" $LOG_PATH_ARGS \
  | grep -iE 'revert|hotfix|emergency|rollback|urgent|critical.fix' || echo "(none found)"

# --- 6. Deleted Files ---
separator "DELETED_FILES"
echo "# Files deleted in analysis period (top ${TOP})"
git log --diff-filter=D --name-only --format='' --since="$SINCE" $LOG_PATH_ARGS \
  | grep -v '^$' \
  | sort | uniq -c | sort -nr | head -"$TOP" || echo "(none found)"

# --- 7. Churn Velocity ---
separator "CHURN_VELOCITY"
echo "# Monthly change counts for top churn files (last 6 months, month by month)"
# Get top 10 churn files, then show their monthly breakdown
top_churn_files=$(git log --format=format: --name-only --since="$SINCE" $LOG_PATH_ARGS \
  | grep -v '^$' \
  | sort | uniq -c | sort -nr | head -10 | awk '{print $2}')

for file in $top_churn_files; do
  echo ""
  echo "--- $file ---"
  git log --format='%ad' --date=format:'%Y-%m' --since="6 months ago" -- "$file" 2>/dev/null \
    | sort | uniq -c | sort -k2 || echo "  (no recent changes)"
done

# --- 8. Cross-Reference: Churn + Bugs ---
separator "CROSS_REFERENCE"
echo "# Files appearing in BOTH churn top-20 AND bug-fix top-20"

churn_files=$(git log --format=format: --name-only --since="$SINCE" $LOG_PATH_ARGS \
  | grep -v '^$' \
  | sort | uniq -c | sort -nr | head -"$TOP" | awk '{print $2}')

bug_files=$(git log -i -E --grep="fix|bug|broken|patch|issue|defect" --name-only --format='' --since="$SINCE" $LOG_PATH_ARGS \
  | grep -v '^$' \
  | sort | uniq -c | sort -nr | head -"$TOP" | awk '{print $2}')

overlap=$(comm -12 <(echo "$churn_files" | sort) <(echo "$bug_files" | sort))

if [[ -n "$overlap" ]]; then
  for f in $overlap; do
    churn_count=$(echo "$churn_files" | grep -c "^${f}$" || true)
    echo "  $f"
  done
else
  echo "(no overlap found)"
fi

separator "END"
echo "Collection complete."
