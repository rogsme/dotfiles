#!/bin/bash

i3status --config ~/.config/i3status/config | while :
do
    read line
    LG=$(setxkbmap -query | awk '/layout/{print $2}')
    if [ $LG == "es" ]
    then
        dat="[{ \"full_text\": \"LANG: $LG\", \"color\":\"#88b090\" },"
    else
        dat="[{ \"full_text\": \"LANG: $LG\", \"color\":\"#e89393\" },"
    fi
    echo "${line/[/$dat}" || exit 1
done
