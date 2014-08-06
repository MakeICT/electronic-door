#!/usr/bin/python
# -*- coding: utf-8 -*-
'''
MakeICT/Bluebird Arthouse Electronic Door Entry

door-lock.py: unlocks the door on a succesful NFC read

Authors:
	Dominic Canare <dom@greenlightgo.org>
	Rye Kennedy <ryekennedy@gmail.com>
'''

import subprocess, time, sys, os, signal, logging, logging.config

from backend import backend
from rpi import interfaceControl

#@TODO: this may not be necessary?
#import setproctitle
#setproctitle.setproctitle('door-lock.py')

lastDoorStatus = [0,0]

logging.config.fileConfig("/home/pi/code/makeictelectronicdoor/logging.conf")
logger=logging.getLogger('door-lock')

logger.info("==========[Door-lock.py started]==========")
def signal_term_handler(sig, frame):
	logger.info("Received SIGTERM")
	cleanup()

def cleanup():
	logger.info("Cleaning up and exiting")
	interfaceControl.cleanup()
	sys.exit(0)
 
signal.signal(signal.SIGTERM, signal_term_handler)

while True:
	try:
		interfaceControl.setPowerStatus(True)
		nfcID = interfaceControl.nfcGetUID()
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

		if nfcID != None:
			logger.info("Scanned card ID: %s" % nfcID)
			user = backend.getUserFromKey(nfcID)	
			if user != None:
				if user['status'] == 'active':
					logger.info("ACCEPTED card ID: %s" % nfcID)
					logger.info("Access granted to '%s %s'" % (user['firstName'], user['lastName']))
					backend.log('unlock', nfcID, user['userID'])
					logger.info("Door 1: UNLOCKED")
					interfaceControl.unlockDoor()
					logger.info("Door 1: LOCKED")
				else:
					logger.warning("DENIED card  ID: %s" % nfcID)
					logger.warning("Reason: '%s %s' is not active" % (user['firstName'], user['lastName']))
					backend.log('deny:', nfcID, user['userID'])
					interfaceControl.showBadCardRead()
			else:
				logger.warning("DENIED card  ID: %s" % nfcID)
				logger.warning("Reason: card not registered")
				backend.log('deny', nfcID)
				interfaceControl.showBadCardRead()

		time.sleep(1)

	except KeyboardInterrupt:
		logger.info("Received KeyboardInterrupt")
		cleanup()

