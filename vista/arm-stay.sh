#!/bin/bash

echo "Sending arm-stay..."

cd /home/pi/code/makeictelectronicdoor/vista/
node send-code.js armStay

exit $?

