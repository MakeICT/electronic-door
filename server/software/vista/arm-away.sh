#!/bin/bash

echo "Sending arm away..."

/home/pi/code/makeictelectronicdoor/vista/send-code.sh 2
/home/pi/code/makeictelectronicdoor/vista/send-code.sh 2

exit $?

