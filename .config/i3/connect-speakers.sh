#!/bin/bash

MAC="7C:96:D2:6E:79:CA"

powered() {
    echo "show" | bluetoothctl | grep "Powered" | cut -d " " -f 2
}

connected() {
    echo "info ${MAC}" | bluetoothctl | grep "Connected" | cut -d " " -f 2
}

echo "trust ${MAC}" | bluetoothctl
while [ $(connected) = no ]
do
    sleep 1
    if [ $(powered) = yes ] && [ $(connected) = no ]; then
        echo "connect ${MAC}" | bluetoothctl
        sleep 5
    fi
done

echo "Connected"
