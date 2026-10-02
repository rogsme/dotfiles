#!/usr/bin/env bash
# ~/.local/bin/handy-toggle.sh

STATE_FILE="/tmp/handy-recording"
PAUSED_FILE="/tmp/handy-paused-players"
APP_NAME="Handy"
STACK_TAG="handy-toggle"

notify_state() {
    local icon="$1"
    local body="$2"

    notify-send \
        -a "$APP_NAME" \
        -i "$icon" \
        -u low \
        -t 3500 \
        -h "string:x-dunst-stack-tag:$STACK_TAG" \
        "$APP_NAME" \
        "$body"
}

pause_playing_media() {
    # Pause every currently-playing player and remember which ones
    # this script paused, so resume only touches those.
    command -v playerctl >/dev/null 2>&1 || return 0
    : >"$PAUSED_FILE"

    while IFS= read -r player; do
        [[ "$(playerctl -p "$player" status 2>/dev/null)" == "Playing" ]] || continue
        playerctl -p "$player" pause
        printf '%s\n' "$player" >>"$PAUSED_FILE"
    done < <(playerctl -l 2>/dev/null)
}

resume_paused_media() {
    # Resume only the players this script paused, and only if they are
    # still paused — never restart something the user stopped manually.
    [[ -f "$PAUSED_FILE" ]] || return 0

    while IFS= read -r player; do
        [[ -n "$player" ]] || continue
        [[ "$(playerctl -p "$player" status 2>/dev/null)" == "Paused" ]] || continue
        playerctl -p "$player" play
    done <"$PAUSED_FILE"

    rm -f "$PAUSED_FILE"
}

if [[ -f "$STATE_FILE" ]]; then
    handy --toggle-post-process
    rm "$STATE_FILE"
    resume_paused_media
    notify_state "media-record" "Transcription stopped"
else
    handy --toggle-post-process
    touch "$STATE_FILE"
    pause_playing_media
    notify_state "audio-input-microphone" "Transcription started..."
fi
