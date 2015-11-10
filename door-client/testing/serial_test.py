#!/usr/bin/python

import time
import serial

ser = serial.Serial('/dev/ttyACM0', 9600)
serial_line = serial.readline()
print serial_line
