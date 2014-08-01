#!/usr/bin/python
# -*- coding: utf-8 -*-
'''
MakeICT/Bluebird Arthouse Electronic Door Entry

enroll.py: Enrolls a user
Usage: enroll.py [userID [rfid]]

Authors:
	Dominic Canare <dom@greenlightgo.org>
	Rye Kennedy <ryekennedy@gmail.com>

@TODO: use POSIX command line arguments for non-interactive mode
@TODO: define error status codes here (duplicate key error)
'''

import sys, os, signal, time
import subprocess
import logging, logging.config
from backend import backend
from rpi import interfaceControl

logging.config.fileConfig('/home/pi/code/makeictelectronicdoor/logging.conf')
log = logging.getLogger('enroll')

log.info('==========[enroll.py started]==========')

process = subprocess.Popen(['pidof', 'door-lock.py'], stdout=subprocess.PIPE)
out, err = process.communicate()

if out != '':
	log.debug('Killing door-lock.py')
	os.kill(int(out), signal.SIGTERM)
	time.sleep(1)
	try:
		if os.kill(int(out), 0) == None:
			log.error('Could not kill door-lock.py')
			log.error('Exiting')
			exit(1)		#@TODO:define error codes
		else:
			log.debug('Successfully killed door-lock.py')
	except OSError:
		log.debug('Successfully killed door-lock.py')
		

if len(sys.argv) > 1:
	userID = int(sys.argv[1])
else:
	email = raw_input("Email      : ")
	user = backend.getUserByEmail(email)
	if user != None:
		confirmUser = raw_input("Found user [%d] %s %s. Use this person [y|n]: " % (user['userID'], user['firstName'], user['lastName']))
		if not confirmUser.lower() == 'y':
			exit()

		userID = user['userID']
	else:
		print "\nUser not found. Creating new user..."
		firstName = raw_input("First Name : ")
		lastName = raw_input("Last  Name : ")
		password = raw_input("Password   : ")
		
		userID = backend.addUser(email, firstName, lastName, password)
		if userID != None:
			print "\nUser [%d] added to the database" % userID
		else:
			print "\nFailed to add user"
			exit(1)
	
if len(sys.argv) >= 3:
	nfcID = sys.argv[2]
else:
	interfaceControl.setPowerStatus(True)
	proc = subprocess.Popen("/home/pi/code/makeictelectronicdoor/nfc-read", stdout=subprocess.PIPE, shell=True)
	(nfcID, err) = proc.communicate()
	nfcID = nfcID.strip()
	interfaceControl.setPowerStatus(False)
	
autoSteal = (len(sys.argv) >= 4 and sys.argv[3] == 'steal')
if userID != "" and nfcID != "":
	# @TODO: catch duplicate key error, exit with error status
	backend.enroll(nfcID, userID, autoSteal)

	print "\nUser [%d] enrolled with ID: %s" % (userID, nfcID)

interfaceControl.cleanup()
#FNULL = open(os.devnull, 'w')
FNULL = open('/home/pi/code/makeictelectronicdoor/piped-door-lock.log', 'w')
log.debug('Re-starting door-lock.py')
subprocess.Popen(['/home/pi/code/makeictelectronicdoor/door-lock.py'], stdout=FNULL, stderr=subprocess.STDOUT)
