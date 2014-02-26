#!/usr/bin/python
# -*- coding: utf-8 -*-
'''
MakeICT/Bluebird Arthouse Electronic Door Entry

enroll.py: Enrolls a user
Usage: enroll.py userID [rfid]

Authors:
	Dominic Canare <dom@greenlightgo.org>
	Rye Kennedy <ryekennedy@gmail.com>
'''

import sys
import subprocess
import RPi.GPIO as GPIO

from backend import backend

GPIO.setwarnings(False)
GPIO.setmode(GPIO.BCM)
GPIO.setup(25, GPIO.OUT)

if len(sys.argv) < 2:
	print "You must specify the userID"
	exit();

userID = sys.argv[1]
if len(sys.argv) >= 3:
	nfcID = sys.argv[2]
else:
	# @TODO: set LED states
	proc = subprocess.Popen("./nfc-read", stdout=subprocess.PIPE, shell=True)
	(nfcID, err) = proc.communicate()
	nfcID = nfcID.strip()
	# @TODO: set LED states
	
autoSteal = len(sys.argv) >= 4 and sys.argv[3] == 'steal':
if userID != "" and nfcID != "":
	# @TODO: catch duplicate key error, exit with error status
	backend.enroll(nfcID, userID, autoSteal)
		
