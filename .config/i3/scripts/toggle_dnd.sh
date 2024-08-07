#!/bin/bash

state=$(xfconf-query -c xfce4-notifyd -p /do-not-disturb)
if [ "$state" = "true" ]; then
  xfconf-query -c xfce4-notifyd -p /do-not-disturb -s false
  notify-send "Do not disturb: Disabled" -t 2000 -i notification
else
  xfconf-query -c xfce4-notifyd -p /do-not-disturb -s true
  notify-send -u critical "Do not disturb: Enabled" -t 2000 -i notification
fi
