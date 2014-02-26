#!/usr/bin/python
# -*- coding: utf-8 -*-
'''
MakeICT/Bluebird Arthouse Electronic Door Entry

door-lock.py: unlocks the door on a succesful NFC read

Authors:
	Dominic Canare <dom@greenlightgo.org>
	Rye Kennedy <ryekennedy@gmail.com>
'''

import subprocess, time
import RPi.GPIO as GPIO

from backend import backend

GPIO.setwarnings(False)
GPIO.setmode(GPIO.BCM)
GPIO.setup(25, GPIO.OUT)

while True:
	proc = subprocess.Popen("./nfc-read", stdout=subprocess.PIPE, shell=True)
	(nfcID, err) = proc.communicate()
	nfcID = nfcID.strip()

	if nfcID != "":
		print "ID:", nfcID, "=",
		user = backend.getUserFromKey(nfcID)	
		if user != None:
			print "GRANTED TO '%s' '%s' '%s'" % (user['firstName'], user['lastName'], user['email'])
			backend.log('unlock', nfcID, user['userID'])

			# @TODO: pull pin HIGH to un-latch door
			# @TODO: set LED states
			GPIO.output(25, True);
			time.sleep(2)
			GPIO.output(25, False);
		else:
			print "DENIED"
			backend.log('deny', nfcID)

			# @TODO: set LED states
			GPIO.output(25, True);
			time.sleep(.25)
			GPIO.output(25, False);
			time.sleep(.25)
			GPIO.output(25, True);
			time.sleep(.25)
			GPIO.output(25, False);

	time.sleep(1)

GPIO.cleanup()

