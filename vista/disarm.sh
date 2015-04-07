#!/bin/bash

echo "Sending disarm..."

/home/pi/code/makeictelectronicdoor/vista/send-code.sh 1
/home/pi/code/makeictelectronicdoor/vista/send-code.sh 1

exit $?

