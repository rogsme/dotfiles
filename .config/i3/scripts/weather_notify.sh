#!/bin/bash
#
# | '__/ _ \ / _` / __|    Roger González
# | | | (_) | (_| \__ \    https://rogs.me
# |_|  \___/ \__, |___/    https://git.rogs.me
#            |___/
#
LOCATION="Montevideo"

while true; do
    WEATHER=$(curl -s "wttr.in/$LOCATION?format=3")
    notify-send "Weather Update" "$WEATHER"
    sleep 7200
done
