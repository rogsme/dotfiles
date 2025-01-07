#!/bin/bash
#
# | '__/ _ \ / _` / __|    Roger González
# | | | (_) | (_| \__ \    https://rogs.me
# |_|  \___/ \__, |___/    https://git.rogs.me
#            |___/
#
while true; do
    if ! ping -c 1 -q 1.1.1.1 &>/dev/null; then
        notify-send "Internet Down" "You have lost connection to the internet." -u critical
    fi
    sleep 30
done
