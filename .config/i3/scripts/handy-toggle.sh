#!/usr/bin/env bash
# ~/.local/bin/handy-toggle.sh

STATE_FILE="/tmp/handy-recording"

if [[ -f "$STATE_FILE" ]]; then
    handy --toggle-post-process
    rm "$STATE_FILE"
    notify-send -u low -t 2000 "🎙️ Handy" "Transcription stopped"
else
    handy --toggle-post-process
    touch "$STATE_FILE"
    notify-send -u low -t 2000 "🎙️ Handy" "Transcription started..."
fi
