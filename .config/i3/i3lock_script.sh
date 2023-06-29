#!/bin/bash
#
# | '__/ _ \ / _` / __|    Roger González
# | | | (_) | (_| \__ \    https://rogs.me
# |_|  \___/ \__, |___/    https://git.rogs.me
#            |___/
#
keepassxc --lock
#if pidof openvpn; then
    #notify-send "Shutting down VPN"
    #pritunl-client stop r1e5vfvldadchscs
#fi
scrot /tmp/screen.png
xwobf -s 11 /tmp/screen.png
i3lock -i /tmp/screen.png
#i3lock -c 000000
rm /tmp/screen.png
