#!/usr/bin/env bash
# ~/.local/bin/handy-toggle.sh

STATE_FILE="/tmp/handy-recording"
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

if [[ -f "$STATE_FILE" ]]; then
    handy --toggle-post-process
    rm "$STATE_FILE"
    notify_state "media-record" "Transcription stopped"
else
    handy --toggle-post-process
    touch "$STATE_FILE"
    notify_state "audio-input-microphone" "Transcription started..."
fi
