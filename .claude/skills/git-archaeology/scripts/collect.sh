#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage: collect.sh [--repo <repository>] [--scope <subdirectory>] [--since <period>] [--top <n>]

  --repo   Repository working tree (default: current directory)
  --scope  Repository-relative path to analyze (default: entire repository)
  --since  Git date expression, e.g. "6 months ago" (default: project age, capped at 1 year)
  --top    Maximum rows in ranked sections (default: 20, maximum: 100)
  --help   Show this help
EOF
}

REPO_PATH="."
SCOPE_PATH=""
SINCE=""
TOP=20

while (($#)); do
  case "$1" in
    --repo|--scope|--since|--top)
      (($# >= 2)) || { printf 'ERROR: %s requires a value.\n' "$1" >&2; exit 2; }
      case "$1" in
        --repo) REPO_PATH=$2 ;;
        --scope) SCOPE_PATH=$2 ;;
        --since) SINCE=$2 ;;
        --top) TOP=$2 ;;
      esac
      shift 2
      ;;
    --help)
      usage
      exit 0
      ;;
    *)
      printf 'ERROR: unknown argument: %s\n' "$1" >&2
      usage >&2
      exit 2
      ;;
  esac
done

[[ $TOP =~ ^[1-9][0-9]*$ ]] || { printf 'ERROR: --top must be a positive integer.\n' >&2; exit 2; }
((TOP <= 100)) || { printf 'ERROR: --top cannot exceed 100.\n' >&2; exit 2; }
[[ -d $REPO_PATH ]] || { printf 'ERROR: repository path is not a directory: %s\n' "$REPO_PATH" >&2; exit 1; }

if ! REPO_ROOT=$(git -C "$REPO_PATH" rev-parse --show-toplevel 2>/dev/null); then
  printf 'ERROR: not a git repository: %s\n' "$REPO_PATH" >&2
  exit 1
fi
git -C "$REPO_ROOT" rev-parse --verify HEAD >/dev/null 2>&1 || {
  printf 'ERROR: repository has no commits: %s\n' "$REPO_ROOT" >&2
  exit 1
}

if [[ -n $SCOPE_PATH ]]; then
  [[ $SCOPE_PATH != /* && $SCOPE_PATH != .. && $SCOPE_PATH != ../* && $SCOPE_PATH != */../* && $SCOPE_PATH != */.. ]] || {
    printf 'ERROR: --scope must be a repository-relative path without .. segments.\n' >&2
    exit 2
  }
  [[ -d "$REPO_ROOT/$SCOPE_PATH" ]] || {
    printf 'ERROR: --scope is not a repository subdirectory: %s\n' "$SCOPE_PATH" >&2
    exit 2
  }
  PATHSPEC=(-- ":(literal)$SCOPE_PATH")
else
  PATHSPEC=()
fi

if [[ -z $SINCE ]]; then
  first_commit_epoch=$(git -C "$REPO_ROOT" log --no-merges --reverse --format='%at' HEAD | awk 'NR == 1 { first=$0 } END { print first }')
  if [[ -z $first_commit_epoch ]]; then
    first_commit_epoch=$(git -C "$REPO_ROOT" log --reverse --format='%at' HEAD | awk 'NR == 1 { first=$0 } END { print first }')
  fi
  [[ $first_commit_epoch =~ ^[0-9]+$ ]] || { printf 'ERROR: could not determine repository age.\n' >&2; exit 1; }
  now_epoch=$(date +%s)
  age_days=$(((now_epoch - first_commit_epoch) / 86400))
  ((age_days < 0)) && age_days=0
  if ((age_days <= 365)); then
    SINCE="@$((first_commit_epoch - 1))"
    TIMEFRAME_NOTE="Full project history (${age_days} days)"
  else
    SINCE="1 year ago"
    TIMEFRAME_NOTE="Last 12 months (automatic cap)"
  fi
else
  TIMEFRAME_NOTE="Custom: since ${SINCE}"
fi

# Validate the date expression before producing a partial report.
git -C "$REPO_ROOT" rev-list --count --no-merges --since="$SINCE" HEAD "${PATHSPEC[@]}" >/dev/null

separator() {
  printf '\n======== %s ========\n\n' "$1"
}

display_path() {
  local value=$1
  value=${value//$'\n'/\\n}
  value=${value//$'\t'/\\t}
  printf '%s' "$value"
}

increment_file_counts() {
  local counts_name=$1 file
  local -n counts=$counts_name
  while IFS= read -r -d '' file; do
    [[ -n $file ]] || continue
    counts["$file"]=$(( ${counts["$file"]:-0} + 1 ))
  done
}

ranked_records() {
  local counts_name=$1 file
  local -n counts=$counts_name
  for file in "${!counts[@]}"; do
    printf '%020d%s\0' "${counts["$file"]}" "$file"
  done | sort -z -r
}

print_ranked() {
  local counts_name=$1 limit=$2 record count_text count file shown=0
  while IFS= read -r -d '' record; do
    count_text=${record:0:20}
    count=$((10#$count_text))
    file=${record:20}
    if ((shown < limit)); then
      printf '%4d\t' "$count"
      display_path "$file"
      printf '\n'
      shown=$((shown + 1))
    fi
  done < <(ranked_records "$counts_name")
  ((shown > 0)) || printf '(none found)\n'
}

month_index() {
  local year=${1%-*} month=${1#*-}
  printf '%d' $((10#$year * 12 + 10#$month - 1))
}

month_from_index() {
  local index=$1
  printf '%04d-%02d' "$((index / 12))" "$((index % 12 + 1))"
}

declare -A churn_counts=() bug_counts=() deleted_counts=()
increment_file_counts churn_counts < <(
  git -C "$REPO_ROOT" log --no-merges --format= --name-only -z --since="$SINCE" HEAD "${PATHSPEC[@]}"
)
increment_file_counts bug_counts < <(
  git -C "$REPO_ROOT" log --no-merges --extended-regexp --regexp='fix|bug|broken|patch|issue|defect' \
    --regexp-ignore-case --format= --name-only -z --since="$SINCE" HEAD "${PATHSPEC[@]}"
)
increment_file_counts deleted_counts < <(
  git -C "$REPO_ROOT" log --no-merges --diff-filter=D --format= --name-only -z \
    --since="$SINCE" HEAD "${PATHSPEC[@]}"
)

total_commits=$(git -C "$REPO_ROOT" rev-list --count --no-merges --since="$SINCE" HEAD "${PATHSPEC[@]}")
all_time_commits=$(git -C "$REPO_ROOT" rev-list --count --no-merges HEAD "${PATHSPEC[@]}")
total_contributors=$(git -C "$REPO_ROOT" shortlog -sne --no-merges --since="$SINCE" HEAD "${PATHSPEC[@]}" | wc -l)
all_time_contributors=$(git -C "$REPO_ROOT" shortlog -sne --no-merges HEAD "${PATHSPEC[@]}" | wc -l)
firefighting_count=$(git -C "$REPO_ROOT" rev-list --count --no-merges --extended-regexp \
  --regexp='revert|hotfix|emergency|rollback|urgent|critical[[:space:]_-]*fix' \
  --regexp-ignore-case --since="$SINCE" HEAD "${PATHSPEC[@]}")
bug_commit_count=$(git -C "$REPO_ROOT" rev-list --count --no-merges --extended-regexp \
  --regexp='fix|bug|broken|patch|issue|defect' --regexp-ignore-case \
  --since="$SINCE" HEAD "${PATHSPEC[@]}")

separator METADATA
printf 'repo: %s\n' "$(basename "$REPO_ROOT")"
printf 'repo_root: %s\n' "$REPO_ROOT"
printf 'analyzed: %s\n' "$(date -u '+%Y-%m-%d %H:%M UTC')"
printf 'timeframe: %s\n' "$TIMEFRAME_NOTE"
printf 'since: %s\n' "$SINCE"
printf 'scope: %s\n' "${SCOPE_PATH:-entire repository}"
printf 'merges: excluded from every commit-based metric\n'
printf 'identity_normalization: Git mailmap plus exact name/email; unresolved aliases and bots remain separate\n'
printf 'top_n: %d\n' "$TOP"
printf 'commits_in_period: %d\n' "$total_commits"
printf 'commits_all_time: %d\n' "$all_time_commits"
printf 'contributors_in_period: %d\n' "$total_contributors"
printf 'contributors_all_time: %d\n' "$all_time_contributors"

separator CHURN_HOTSPOTS
printf '# File change indicators (top %d)\n' "$TOP"
print_ranked churn_counts "$TOP"

separator CONTRIBUTORS_ALL_TIME
printf '# All-time identities; .mailmap applied, bots included (top %d)\n' "$TOP"
git -C "$REPO_ROOT" shortlog -sne --no-merges HEAD "${PATHSPEC[@]}" | awk -v limit="$TOP" 'NR <= limit'

separator CONTRIBUTORS_IN_PERIOD
printf '# Identities active in the analysis period; .mailmap applied, bots included (top %d)\n' "$TOP"
git -C "$REPO_ROOT" shortlog -sne --no-merges --since="$SINCE" HEAD "${PATHSPEC[@]}" | awk -v limit="$TOP" 'NR <= limit'

separator BUG_CLUSTERS
printf '# Files changed by fix-keyword commits (top %d)\n' "$TOP"
printf 'matching_commits: %d of %d non-merge commits in period\n' "$bug_commit_count" "$total_commits"
print_ranked bug_counts "$TOP"

separator MOMENTUM
printf '# Non-merge commits per calendar month; zero months included, at most 60 months\n'
declare -A month_counts=()
oldest_month=""
while IFS= read -r month; do
  [[ -n $month ]] || continue
  month_counts["$month"]=$(( ${month_counts["$month"]:-0} + 1 ))
  oldest_month=$month
done < <(git -C "$REPO_ROOT" log --no-merges --format='%ad' --date=format:'%Y-%m' \
  --since="$SINCE" HEAD "${PATHSPEC[@]}")
if [[ -z $oldest_month ]]; then
  printf '(no commits in period)\n'
else
  current_index=$(month_index "$(date -u '+%Y-%m')")
  start_index=$(month_index "$oldest_month")
  if ((current_index - start_index + 1 > 60)); then
    start_index=$((current_index - 59))
    printf '# Older monthly rows omitted to keep output bounded.\n'
  fi
  for ((index=start_index; index<=current_index; index++)); do
    month=$(month_from_index "$index")
    printf '%4d\t%s\n' "${month_counts["$month"]:-0}" "$month"
  done
fi

separator FIREFIGHTING
printf '# Firefighting-keyword commits: %d of %d non-merge commits in period\n' "$firefighting_count" "$total_commits"
if ((firefighting_count == 0)); then
  printf '(none found)\n'
else
  git -C "$REPO_ROOT" log --no-merges --max-count="$TOP" --format='%h%x09%ad%x09%s' --date=short \
    --extended-regexp --regexp='revert|hotfix|emergency|rollback|urgent|critical[[:space:]_-]*fix' \
    --regexp-ignore-case --since="$SINCE" HEAD "${PATHSPEC[@]}"
fi

separator DELETED_FILES
printf '# Deletion indicators in the analysis period (top %d)\n' "$TOP"
print_ranked deleted_counts "$TOP"

separator CHURN_VELOCITY
printf '# Monthly changes for top churn files over the last 6 calendar months (top 10 files)\n'
declare -a top_churn_files=()
declare -A bug_rank=()
record_index=0
while IFS= read -r -d '' record; do
  file=${record:20}
  record_index=$((record_index + 1))
  ((record_index <= 10)) && top_churn_files+=("$file")
done < <(ranked_records churn_counts)
record_index=0
while IFS= read -r -d '' record; do
  file=${record:20}
  record_index=$((record_index + 1))
  ((record_index <= TOP)) || continue
  bug_rank["$file"]=$record_index
done < <(ranked_records bug_counts)

velocity_end=$(month_index "$(date -u '+%Y-%m')")
velocity_start=$((velocity_end - 5))
if ((${#top_churn_files[@]} == 0)); then
  printf '(none found)\n'
else
  for file in "${top_churn_files[@]}"; do
    printf '\n--- '
    display_path "$file"
    printf ' ---\n'
    declare -A velocity_counts=()
    while IFS= read -r month; do
      [[ -n $month ]] || continue
      velocity_counts["$month"]=$(( ${velocity_counts["$month"]:-0} + 1 ))
    done < <(git -C "$REPO_ROOT" log --no-merges --format='%ad' --date=format:'%Y-%m' \
      --since='6 months ago' HEAD -- "$file")
    for ((index=velocity_start; index<=velocity_end; index++)); do
      month=$(month_from_index "$index")
      printf '%4d\t%s\n' "${velocity_counts["$month"]:-0}" "$month"
    done
    unset velocity_counts
  done
fi

separator CROSS_REFERENCE
printf '# Files in both bounded churn and fix-keyword rankings\n'
overlap_count=0
record_index=0
while IFS= read -r -d '' record; do
  file=${record:20}
  record_index=$((record_index + 1))
  ((record_index <= TOP)) || continue
  [[ ${bug_rank["$file"]+present} ]] || continue
  printf 'churn_rank=%d\tbug_rank=%d\t' "$record_index" "${bug_rank["$file"]}"
  display_path "$file"
  printf '\n'
  overlap_count=$((overlap_count + 1))
done < <(ranked_records churn_counts)
((overlap_count > 0)) || printf '(no overlap found)\n'

separator END
printf 'Collection complete.\n'
