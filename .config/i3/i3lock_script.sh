#!/bin/bash
#
# | '__/ _ \ / _` / __|    Roger González
# | | | (_) | (_| \__ \    https://rogs.me
# |_|  \___/ \__, |___/    https://git.rogs.me
#            |___/
#
scrot /tmp/screen.png
xwobf -s 11 /tmp/screen.png
i3lock -i /tmp/screen.png
rm /tmp/screen.png
