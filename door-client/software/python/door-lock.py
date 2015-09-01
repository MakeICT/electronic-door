#!/usr/bin/python
# -*- coding: utf-8 -*-
'''
MakeICT/Bluebird Arthouse Electronic Door Entry

door-lock.py: unlocks the door on a succesful NFC read

Authors:
	Dominic Canare <dom@greenlightgo.org>
	Rye Kennedy <ryekennedy@gmail.com>
	Christian Kindel <iceman81292@gmail.com>
'''

import os, time, sys, signal, subprocess, logging, logging.config, yaml

from backend import backend
from rpi import interfaceControl

Dir = os.path.realpath(os.path.dirname(__file__))
config = os.path.join(Dir, 'config.yml')
global_config = yaml.load(file(config, 'r'))

lastDoorStatus = [0,0]
logging.config.dictConfig(global_config['logging'])
log=logging.getLogger('door-lock')

log.info("==========[door-lock.py started]==========")
def signal_term_handler(sig, frame):
	log.info("Received SIGTERM")
	cleanup()
signal.signal(signal.SIGTERM, signal_term_handler)

def cleanup():
	log.info("Cleaning up and exiting")
	interfaceControl.cleanup()
	if interfaceControl.PN532:
		process = subprocess.Popen(['pidof', 'nfc-poll'], stdout=subprocess.PIPE)
		out, err = process.communicate()
		if out != '':
			os.kill(int(out), signal.SIGTERM)
	sys.exit(0)

def checkDoors():
	global lastDoorStatus
	currentDoorStatus = interfaceControl.checkDoors()

	if currentDoorStatus[0] > lastDoorStatus[0]:
		log.info("Door 1: OPEN")
	elif currentDoorStatus[0] < lastDoorStatus[0]:
		log.info("Door 1: CLOSED")
		proc = subprocess.Popen(['/home/pi/code/makeictelectronicdoor/vista/arm-away.sh'], stdout=subprocess.PIPE)
		proc.communicate()
		log.info("Arm Away sent")
	if currentDoorStatus[1] > lastDoorStatus[1]:
		log.info("Door 2: OPEN")
	elif currentDoorStatus[1] < lastDoorStatus[1]:
		log.info("Door 2: CLOSED")

	lastDoorStatus = currentDoorStatus

def checkCards():
#	log.debug("Starting NFC read")
	nfcID = interfaceControl.nfcGetUID()
#	log.debug("Finished NFC read")
	#interfaceControl.setPowerStatus(False)

	if nfcID != None:
		log.info("Scanned card ID: %s" % nfcID)
		user = backend.getUserByKeyID(nfcID)	
		if user != None:
			if user['status'] == 'active':
				log.info("ACCEPTED card ID: %s" % nfcID)
				log.info("Access granted to '%s %s'" % (user['firstName'], user['lastName']))
				backend.log('unlock', nfcID, user['userID'])
				log.info("Door 1: UNLOCKED")
				interfaceControl.unlockDoor()
				proc = subprocess.Popen(['/home/pi/code/makeictelectronicdoor/vista/disarm.sh'], stdout=subprocess.PIPE)
				proc.communicate()
				log.info("Door 1: LOCKED")
			else:
				log.warning("DENIED card  ID: %s" % nfcID)
				log.warning("Reason: '%s %s' is not active" % (user['firstName'], user['lastName']))
				backend.log('deny', nfcID, user['userID'])
				interfaceControl.showBadCardRead()
		else:
			log.warning("DENIED card  ID: %s" % nfcID)
			log.warning("Reason: card not registered")
			backend.log('deny', nfcID)
			interfaceControl.showBadCardRead()

log.debug("Entering monitor loop")
interfaceControl.setPowerStatus(True)
while True:
	try:
		checkDoors()
		checkCards()
		time.sleep(0)

	except KeyboardInterrupt:
		log.info("Received KeyboardInterrupt")
		interfaceControl.setPowerStatus(False)
		cleanup()

