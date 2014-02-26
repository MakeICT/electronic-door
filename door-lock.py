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

from backend import backend
from rpi import interfaceControl

# @TODO: add graceful exit from signal
while True:
	interfaceControl.setPowerStatus(True)
	proc = subprocess.Popen("./nfc-read", stdout=subprocess.PIPE, shell=True)
	(nfcID, err) = proc.communicate()
	nfcID = nfcID.strip()
	interfaceControl.setPowerStatus(False)

	if nfcID != "":
		print "ID:", nfcID, "=",
		user = backend.getUserFromKey(nfcID)	
		if user != None:
			print "GRANTED TO '%s' '%s' '%s'" % (user['firstName'], user['lastName'], user['email'])
			interfaceControl.unlockDoor()
		else:
			print "DENIED"
			interfaceControl.showBadCardRead()

	time.sleep(1)

interfaceControl.cleanup()
