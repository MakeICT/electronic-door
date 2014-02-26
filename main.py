#!/usr/bin/python
# -*- coding: utf-8 -*-
'''
MakeICT/Bluebird Arthouse Electronic Door Entry
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
	(line, err) = proc.communicate()
	line = line.strip()

	if line != "":
		print "ID:", line, "=",
		user = backend.getUserFromKey(line)	
		if user != None:
			print "GRANTED TO '%s' '%s' '%s'" % (user['firstName'], user['lastName'], user['email'])
			# @TODO: pull pin HIGH to un-latch door
			# @TODO: set LED states
			GPIO.output(25, True);
			time.sleep(2)
			GPIO.output(25, False);
		else:
			print "DENIED"
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

