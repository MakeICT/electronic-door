#!/usr/bin/python
# -*- coding: utf-8 -*-
'''
MakeICT/Bluebird Arthouse Electronic Door Entry

door-lock.py: unlocks the door on a succesful NFC read

Authors:
	Dominic Canare <dom@greenlightgo.org>
	Rye Kennedy <ryekennedy@gmail.com>
'''

import subprocess, time, sys, signal

from backend import backend
from rpi import interfaceControl

#@TODO: this may not be necessary?
import setproctitle, os, subprocess, signal
setproctitle.setproctitle('door-lock.py')

lastDoorStatus = [0,0]

def signal_term_handler(sig, frame):
	interfaceControl.cleanup()
	process = subprocess.Popen(['pidof', 'nfc-poll'], stdout=subprocess.PIPE)
	out, err = process.communicate()
	if out != '':
		os.kill(int(out), signal.SIGTERM)
	print "door-lock.py: got SIGTERM - cleaning up and exiting"
	sys.exit(0)
 
signal.signal(signal.SIGTERM, signal_term_handler)

# @TODO: add graceful exit from signal
while True:
	try:
		interfaceControl.setPowerStatus(True)
		proc = subprocess.Popen("/home/pi/code/makeictelectronicdoor/nfc-read", stdout=subprocess.PIPE, shell=True)
		(nfcID, err) = proc.communicate()
		nfcID = nfcID.strip()
		interfaceControl.setPowerStatus(False)
		currentDoorStatus = interfaceControl.checkDoors()

		if currentDoorStatus[0] > lastDoorStatus[0]:
			print "DOOR 1 OPEN"
		elif currentDoorStatus[0] < lastDoorStatus[0]:
			print "DOOR 1 CLOSED"
		if currentDoorStatus[1] > lastDoorStatus[1]:
			print "DOOR 2 OPEN"
		elif currentDoorStatus[1] < lastDoorStatus[1]:
			print "DOOR 2 CLOSED"

		lastDoorStatus = currentDoorStatus

		if nfcID != "":
			print "ID:", nfcID, "=",
			user = backend.getUserFromKey(nfcID)
			if user != None:
				if user['status'] == 'active':
					print "GRANTED TO '%s' '%s' '%s'" % (user['firstName'], user['lastName'], user['email'])
					interfaceControl.unlockDoor()
				else:
					print "'%s' is not active" % (user['firstName'])
					interfaceControl.showBadCardRead()
			else:
				print "DENIED"
				interfaceControl.showBadCardRead()

		time.sleep(1)

	except KeyboardInterrupt:
		interfaceControl.cleanup()
		sys.exit()
