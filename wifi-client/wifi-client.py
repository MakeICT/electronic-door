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
# from backend import backend
from rpi import interfaceControl
from MCP_API import McpApiClient

import RPi.GPIO as GPIO
import MFRC522

Dir = os.path.realpath(os.path.dirname(__file__))
config = os.path.join(Dir, 'config.yml')
global_config = yaml.load(open(config, 'r'))

lastDoorStatus = [0,0]
logging.config.dictConfig(global_config['logging'])
log=logging.getLogger('door-lock')

API = McpApiClient()
API.authenticate_with_contact_credentials(global_config['client']['username'], global_config['client']['password'])


log.info("==========[wifi-client.py started]==========")
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

def checkCards():
	#interfaceControl.setPowerStatus(False)

	if interfaceControl.checkPowerSwitch():
		if interfaceControl.getState() == 'inactive': 
			nfcID = interfaceControl.nfcGetUID()
			if (nfcID != None):
				nfcID = str(nfcID).ljust(14, '0')
				#print(nfcID)
				log.info("---------------------------------------------")
				log.info("Read card ID: %s" % (str(nfcID)))
				interfaceControl.showBusy()
				user = API.GetUserByNFC(nfcID)
				if user:
					#print(user)
					authorized = API.CheckAuthorization(nfcID, 1348)
					log.info("Card belongs to %s %s" % (user['firstName'], user['lastName']))
					if not authorized:
						interfaceControl.showInactive()
						log.warning("DENIED card ID: %s" % (str(nfcID)))
						interfaceControl.showBadCardRead()

						# print('not authorized')
					else:
						log.info("ACCEPTED card ID: %s" % str(nfcID))
						interfaceControl.unlockMachine()
						log.info("Machine Unlocked")

						# print('authorized')
				else:
					log.error("Card is not assigned to a user")
					interfaceControl.showInactive()
					interfaceControl.showBadCardRead()

def checkButtons():
	if not interfaceControl.checkPowerSwitch() and interfaceControl.getState() == 'active':
		interfaceControl.lockMachine()
		log.info("Machine Locked")

log.debug("Entering monitor loop")
interfaceControl.setPowerStatus(True)
while True:
	try:
		checkButtons()
		if interfaceControl.checkPowerSwitch() and interfaceControl.getState() == 'inactive':
			interfaceControl.setPowerStatus(True)
			checkCards()
		else:
			interfaceControl.setPowerStatus(False)
		time.sleep(0)

	except KeyboardInterrupt:
		log.info("Received KeyboardInterrupt")
		interfaceControl.setPowerStatus(False)
		cleanup()

