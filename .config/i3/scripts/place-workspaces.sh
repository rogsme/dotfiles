#!/usr/bin/env bash
set -euo pipefail

# Your intended mapping:
WS_PRIMARY=( "1: " "3: " "5: " "7: " "9" )
WS_SECOND=( "2: " "4: " "6: " "8" "10" )
WS_THIRD=( "11: " )

# Get active outputs
mapfile -t ACTIVE < <(i3-msg -t get_outputs | jq -r '.[] | select(.active) | "\(.name) \(.primary) \(.rect.x)"')

PRIMARY=""
SECOND=""
THIRD=""

# Identify primary
for line in "${ACTIVE[@]}"; do
  name=$(awk '{print $1}' <<<"$line")
  is_primary=$(awk '{print $2}' <<<"$line")
  if [[ "$is_primary" == "true" ]]; then
    PRIMARY="$name"
    break
  fi
done

# Prefer DP-*-1 and DP-*-2 by name
for line in "${ACTIVE[@]}"; do
  name=$(awk '{print $1}' <<<"$line")
  [[ "$name" == "$PRIMARY" ]] && continue
  if [[ "$name" =~ ^DP-.*-1$ ]]; then
    SECOND="$name"
  elif [[ "$name" =~ ^DP-.*-2$ ]]; then
    THIRD="$name"
  fi
done

# Fallback by position if needed
if [[ -z "$SECOND" || -z "$THIRD" ]]; then
  mapfile -t SORTED < <(printf '%s\n' "${ACTIVE[@]}" | sort -n -k3)
  OTHERS=()
  for line in "${SORTED[@]}"; do
    name=$(awk '{print $1}' <<<"$line")
    [[ "$name" == "$PRIMARY" ]] && continue
    OTHERS+=("$name")
  done
  [[ -z "$SECOND" && ${#OTHERS[@]} -ge 1 ]] && SECOND="${OTHERS[0]}"
  [[ -z "$THIRD"  && ${#OTHERS[@]} -ge 2 ]] && THIRD="${OTHERS[1]}"
fi

# Remember current workspace to restore focus later
CUR_WS=$(i3-msg -t get_workspaces | jq -r '.[] | select(.focused).name')

ensure_ws_on_output() {
  local out="$1"; shift
  [[ -z "$out" ]] && return 0
  for ws in "$@"; do
    # Create/select the workspace, move it, then go back
    i3-msg "workspace number $ws; move workspace to output $out; workspace \"$CUR_WS\"" >/dev/null
  done
}

# Place them regardless of whether they're open
ensure_ws_on_output "$PRIMARY" "${WS_PRIMARY[@]}"
ensure_ws_on_output "$SECOND"  "${WS_SECOND[@]}"
ensure_ws_on_output "$THIRD"   "${WS_THIRD[@]}"

# Optional: tidy up focus one more time
i3-msg "workspace \"$CUR_WS\"" >/dev/null

