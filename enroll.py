#!/usr/bin/python
# -*- coding: utf-8 -*-
'''
MakeICT/Bluebird Arthouse Electronic Door Entry

enroll.py: Enrolls a user
Usage: enroll.py [userID [rfid]]

Authors:
	Dominic Canare <dom@greenlightgo.org>
	Rye Kennedy <ryekennedy@gmail.com>
	Christian Kindel <iceman81292@gmail.com>
'''
#@TODO: define error status codes here (duplicate key error)

import os, signal, time, subprocess, argparse, logging, logging.config
from backend import backend
from get_user import getUser
from cli_formats import *
from MySQLdb import IntegrityError


def enroll(userID=None, nfcID=None, steal=False, quiet=False, reader=None):
	if os.environ['USER'] != 'root':
		print "Root is required to run this script"
		return
	restartDoorLock = False

	user = getUser(userID, confirm=False if userID else True)
	if user == None:
		return
	userID = user['userID']
	
	if not reader:
		putMessage(       "Enter key UID manually,")
		choice = getInput("or read key from NFC reader?", options=['m', 'r'])
	if not reader and choice == 'm':
		nfcID = getInput("Enter key UID")
	else:
		try:
			from rpi import interfaceControl
			killDoorLock()
			while True:
				interfaceControl.setPowerStatus(True)
#				log.debug("Starting NFC read")
				if not quiet:
					putMessage("Swipe card now")
				nfcID = interfaceControl.nfcGetUID()
#				log.debug("Finished NFC read")
				interfaceControl.setPowerStatus(False)
				if not nfcID and not quiet:
					retry = getInput("Couldn't read card. Retry?", options=['y', 'n'])
					if nfcID != None or retry != 'y':
						break
				else:
					break
		finally:
			interfaceControl.cleanup()
			if restartDoorLock:
				startDoorLock()
	if nfcID != None:
		# @TODO: catch duplicate key error, exit with error status
		try:
			backend.enroll(nfcID, userID, steal)
			putMessage("User [{:d}] enrolled with ID: {:s}".format(userID, nfcID))
		except IntegrityError:
			putMessage("Key is already assigned!",True)
			putMessage("User not enrolled",True)
	else:
		putMessage("Did not enroll user", True)

def killDoorLock():
	process = subprocess.Popen(['pgrep', 'door-lock.py'], stdout=subprocess.PIPE)
	out, err = process.communicate()
	if out != '':
		restartDoorLock = True
#		log.debug('Killing door-lock.py')
		os.kill(int(out), signal.SIGTERM)
		time.sleep(1)
		try:
			if os.kill(int(out), 0) == None:
#				log.error('Could not kill door-lock.py')
#				log.error('Exiting')
				exit(1)		#@TODO:define error codes
			else:
				pass
#				log.debug('Successfully killed door-lock.py')
		except OSError:
			pass
#			log.debug('Successfully killed door-lock.py')

def startDoorLock():	
	#FNULL = open(os.devnull, 'w')
	FNULL = open('/home/pi/code/makeictelectronicdoor/piped-door-lock.log', 'w')
#	log.debug('Restarting door-lock.py')
	subprocess.Popen(['/home/pi/code/makeictelectronicdoor/door-lock.py'],
			 stdout=FNULL, stderr=subprocess.STDOUT)
	restartDoorLock = False

if __name__ == "__main__":
	parser = argparse.ArgumentParser(description='Enroll a user in the MakeICT database.')
	parser.add_argument("-u", "--userid", help="The user's unique userID.", type=int)
	parser.add_argument("-s", "--steal", help="Re-assign the card if it is already registered to another user.", action="store_true")
	parser.add_argument("-q", "--quiet", help="Suppress prompts and output", action="store_true")
	method = parser.add_mutually_exclusive_group()
	method.add_argument("-n", "--nfcid", help="UID of the user's NFC card.")
	method.add_argument("-r", "--reader", help="Read a card UID from the card reader", action="store_true")
	args = parser.parse_args()

	enroll(args.userid, args.nfcid, args.steal, args.quiet, args.reader)
