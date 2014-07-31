#!/usr/bin/python
# -*- coding: utf-8 -*-
'''
MakeICT/Bluebird Arthouse Electronic Door Entry

door-lock.py: unlocks the door on a succesful NFC read

Authors:
	Dominic Canare <dom@greenlightgo.org>
	Rye Kennedy <ryekennedy@gmail.com>
'''

import subprocess, time, sys, logging, logging.config
from backend import backend
from rpi import interfaceControl

lastDoorStatus = [0,0]

logging.config.fileConfig("logging.conf")
logger=logging.getLogger('door-lock')

logger.info("==========[Door-lock.py started]==========")

# @TODO: add graceful exit from signal
while True:
	try:
		interfaceControl.setPowerStatus(True)
		proc = subprocess.Popen("./nfc-read", stdout=subprocess.PIPE, shell=True)
		(nfcID, err) = proc.communicate()
		nfcID = nfcID.strip()
		interfaceControl.setPowerStatus(False)
		currentDoorStatus = interfaceControl.checkDoors()

		if currentDoorStatus[0] > lastDoorStatus[0]:
			logger.info("Door 1: OPEN")
		elif currentDoorStatus[0] < lastDoorStatus[0]:
			logger.info("Door 1: CLOSED")
		if currentDoorStatus[1] > lastDoorStatus[1]:
			logger.info("Door 2: OPEN")
		elif currentDoorStatus[1] < lastDoorStatus[1]:
			logger.info("Door 2: CLOSED")

		lastDoorStatus = currentDoorStatus

		if nfcID != "":
			logger.info("Scanned card ID: %s" % nfcID)
			user = backend.getUserFromKey(nfcID)	
			if user != None:
				if user['status'] == 'active':
					logger.info("ACCEPTED card ID: %s" % nfcID)
					logger.info("Access granted to '%s %s'" % (user['firstName'], user['lastName']))
					logger.info("Unlocking door")
					interfaceControl.unlockDoor()
				else:
					logger.warning("DENIED card  ID: %s" % nfcID)
					logger.warning("Reason: '%s %s' is not active" % (user['firstName'], user['lastName']))
					interfaceControl.showBadCardRead()
			else:
				logger.warning("DENIED card  ID: %s" % nfcID)
				logger.warning("Reason: card not registered")
				interfaceControl.showBadCardRead()

		time.sleep(1)

	except KeyboardInterrupt:
		interfaceControl.cleanup()
		sys.exit()
