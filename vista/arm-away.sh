#!/bin/bash

echo "Sending arm away..."

cd /home/pi/code/makeictelectronicdoor/vista/
node send-code.sh armAway

exit $?

