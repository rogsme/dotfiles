#!/usr/bin/env bash
#
# handy-smart-paste-x11.sh
#
# Context-aware paste for Handy (https://handy.computer) on X11.
# Handy invokes it as:  handy-smart-paste-x11.sh "<transcribed text>"
# Configure in: Settings > Advanced > Paste Method > External Script
#
# Handy does not touch the clipboard for this paste method, so this script
# owns the flow: detect focused window -> copy -> keystroke -> restore.
#
# Deps: xdotool, xclip (or xsel), xprop (x11-utils, optional but better)
#
# Test:
#   ./handy-smart-paste-x11.sh --detect     # focus a window, run, compare
#   HANDY_PASTE_DEBUG=1 ./handy-smart-paste-x11.sh "hello world"

set -uo pipefail

# Handy may be launched from a .desktop file or systemd user unit where DISPLAY
# is not inherited. Without this, xdotool silently does nothing.
export DISPLAY="${DISPLAY:-:0}"

DELAY_MS="${HANDY_PASTE_DELAY_MS:-120}"
KEEP_CLIP="${HANDY_PASTE_KEEP_CLIP:-0}"
DEBUG="${HANDY_PASTE_DEBUG:-0}"
LOG="${HANDY_PASTE_LOG:-${XDG_STATE_HOME:-$HOME/.local/state}/handy-smart-paste.log}"

log() {
  [ "$DEBUG" = "1" ] || return 0
  mkdir -p "$(dirname "$LOG")" 2>/dev/null
  printf '%s | %s\n' "$(date -Is)" "$*" >>"$LOG"
}

have() { command -v "$1" >/dev/null 2>&1; }

# ---------------------------------------------------------------------------
# Rules. Matched case-insensitively against both WM_CLASS fields
# (instance and class), so "Alacritty"/"alacritty" both hit.
# ---------------------------------------------------------------------------
# Each WM_CLASS field is matched WHOLE against these, so "st" will not
# accidentally match "obsidian". Add suffix wildcards where needed.
TERMINALS='alacritty|kitty|foot|footclient|wezterm|wezterm-gui|ghostty|contour|rio|hyper|st|st-[0-9]+color|xterm|xterm-[0-9]+color|urxvt|rxvt|rxvt-unicode|konsole|gnome-terminal.*|kgx|tilix|terminator|termite|xfce4-terminal|qterminal|lxterminal|sakura|guake|yakuake|tabby'

# Default Emacs binds C-v to scroll-up-command, so Ctrl+V would page down
# instead of pasting. C-y yanks, and picks up the system clipboard.
EMACSLIKE='emacs|emacsclient'

# ---------------------------------------------------------------------------
detect_class() {
  local wid
  wid=$(xdotool getactivewindow 2>/dev/null) || return 1
  [ -n "$wid" ] || return 1

  # Prefer xprop: gives both WM_CLASS fields, e.g. "st-256color", "st"
  if have xprop; then
    xprop -id "$wid" WM_CLASS 2>/dev/null |
      sed -n 's/.*= //p' | tr -d '"' | tr ',' ' '
    return 0
  fi

  xdotool getwindowclassname "$wid" 2>/dev/null
}

choose_combo() {
  local classes tok
  classes=$(printf '%s' "$1" | tr '[:upper:]' '[:lower:]')
  [ -z "$classes" ] && { echo "ctrl+v"; return; }

  for tok in $classes; do
    printf '%s' "$tok" | grep -Eqx "$EMACSLIKE" && { echo "ctrl+y"; return; }
  done
  for tok in $classes; do
    printf '%s' "$tok" | grep -Eqx "$TERMINALS" && { echo "ctrl+shift+v"; return; }
  done
  echo "ctrl+v"
}

clip_get() {
  # -o exits immediately, no daemon, but detach fds anyway for consistency.
  if have xclip; then xclip -selection clipboard -o 2>/dev/null
  elif have xsel; then xsel --clipboard --output 2>/dev/null
  fi
}

# CRITICAL: xclip/xsel fork a background process that stays alive to own the X
# CLIPBOARD selection. That child inherits our stdout/stderr. Handy invokes this
# script with Command::output(), which reads both pipes to EOF before returning,
# so an inherited pipe means Handy blocks forever after the first paste.
# Redirecting to /dev/null (and closing stdin for the daemon) is what keeps
# Handy responsive. Do not remove these redirections.
clip_set() {
  if have xclip; then
    printf '%s' "$1" | xclip -selection clipboard -i >/dev/null 2>&1 &
    wait $! 2>/dev/null
  elif have xsel; then
    printf '%s' "$1" | xsel --clipboard --input >/dev/null 2>&1 &
    wait $! 2>/dev/null
  else
    return 1
  fi
}

# ---------------------------------------------------------------------------
main() {
  local classes combo
  classes=$(detect_class)
  combo=$(choose_combo "$classes")
  log "class='${classes:-<unknown>}' combo=$combo"

  if [ "${1-}" = "--detect" ]; then
    printf 'wm_class: %s\ncombo:    %s\n' "${classes:-<unknown>}" "$combo"
    exit 0
  fi

  local text="${1-}"
  [ -z "$text" ] && exit 0

  have xdotool || { echo "xdotool not installed" >&2; exit 1; }

  local prev=""
  [ "$KEEP_CLIP" = "1" ] || prev=$(clip_get)

  clip_set "$text" || { echo "no clipboard tool (xclip/xsel)" >&2; exit 1; }
  sleep "$(awk -v ms="$DELAY_MS" 'BEGIN{print ms/1000}')"

  xdotool key --clearmodifiers "$combo" || {
    echo "xdotool key failed for $combo" >&2
    exit 1
  }

  if [ "$KEEP_CLIP" != "1" ] && [ -n "$prev" ]; then
    sleep 0.25
    clip_set "$prev"
  fi
}

# Belt and braces: even with the redirections in clip_set, close our own stdout
# and stderr before exiting so nothing we spawned can keep Handy's pipes open.
main "$@"
rc=$?
exec 1>&- 2>&-
exit $rc
