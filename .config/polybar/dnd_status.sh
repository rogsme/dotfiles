#!/bin/bash
set -euo pipefail
IFS=$'\n\t'

STATE=$(xfconf-query -c xfce4-notifyd -p /do-not-disturb)

if [ "$STATE" = "true" ]; then
  echo "DND ✅"
else
  echo "DND ❌"
fi
