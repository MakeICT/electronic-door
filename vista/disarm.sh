#!/bin/bash

echo "Sending disarm..."

cd /home/pi/code/makeictelectronicdoor/vista/
node send-code.js disarm

exit $?

