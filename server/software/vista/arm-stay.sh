#!/bin/bash

echo "Sending arm-stay..."

/home/pi/code/makeictelectronicdoor/vista/send-code.sh 3
/home/pi/code/makeictelectronicdoor/vista/send-code.sh 3

exit $?

