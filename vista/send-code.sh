#!/bin/bash

IP=192.168.0.155

if [ "$#" == "0" ]; then
	echo "Usage: $0 string-of-digits-to-send"
	exit 1
fi

code=$(cat /home/pi/code/makeictelectronicdoor/vista/DOOR_CODE)$1

for (( i=0; i<${#code}; i++ )); do
	#wget --quiet -O- http://$IP/cmd?cmd=${code:$i:1} &
	wget -O- http://$IP/cmd?cmd=${code:$i:1} &
	sleep 0.5
done

