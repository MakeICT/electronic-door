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
#@TODO: use POSIX command line arguments for non-interactive mode
#@TODO: define error status codes here (duplicate key error)


import sys, os, signal, time, subprocess, argparse, logging, logging.config
from backend import backend
from rpi import interfaceControl

parser = argparse.ArgumentParser(description='Enroll a user in the MakeICT database.')
parser.add_argument("mode", choices=['enroll', 'adduser', 'rmuser'])
parser.add_argument("-u", "--userid", help="The user's unique userID.", type=int)
parser.add_argument("-e", "--email", help="The user's email. This functions as the user's unique username.")
parser.add_argument("-f", "--firstname", help="The user's first name.")
parser.add_argument("-l", "--lastname", help="The user's last name.")
parser.add_argument("-p", "--password", help="The user's password.")
parser.add_argument("-n", "--nfcid", help="UID of the user's NFC card.")
parser.add_argument("-s", "--steal", help="Re-assign the card if it is already registered to another user.", action="store_true")
parser.add_argument("-N", "--noninteractive", help="Don't prompt for keyboard input", action="store_true")
args = parser.parse_args()

logging.config.fileConfig('/home/pi/code/makeictelectronicdoor/logging.conf')
log = logging.getLogger('enroll')

log.info('==========[enroll.py started]==========')
restartDoorLock = False


# @TODO: this really only needs to happen if NFC reader access is required
def killDoorLock():
	process = subprocess.Popen(['pgrep', 'door-lock.py'], stdout=subprocess.PIPE)
	out, err = process.communicate()
	if out != '':
		restartDoorLock = True
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

def startDoorLock():	
	#FNULL = open(os.devnull, 'w')
	FNULL = open('/home/pi/code/makeictelectronicdoor/piped-door-lock.log', 'w')
	log.debug('Restarting door-lock.py')
	subprocess.Popen(['/home/pi/code/makeictelectronicdoor/door-lock.py'], stdout=FNULL, stderr=subprocess.STDOUT)
	restartDoorLock = False
		
try:
	user_info = {'userID':args.userid, 'email':args.email, 'firstName':args.firstname, 'lastName':args.lastname, 'password':args.password}
	if args.mode == "rmuser":
		if user_info['userID'] == None:
			parser.print_help()
		backend.rmUser(user_info['userID'])
	
	if args.mode == "adduser":
		if user_info['email'] == None:
			user_info['email'] = raw_input("Email      : ")
		user = backend.getUserByEmail(user_info['email'])
		if user != None:
			print("User [%d] %s %s already exists. Exiting. " % (user['userID'], user['firstName'], user['lastName']))
			exit()
		else:
			if user_info['firstName'] == None:
				user_info['firstName'] = raw_input("First Name : ")
			if user_info['lastName'] == None:
				user_info['lastName'] = raw_input("Last  Name : ")
			if user_info['password'] == None:
				user_info['password'] = raw_input("Password   : ")
			
			user_info['userID'] = backend.addUser(user_info['email'], user_info['firstName'], user_info['lastName'], user_info['password'])
			if user_info['userID'] != None:
				print "\nUser [%d] added to the database" % user_info['userID']
			else:
				print "\nFailed to add user"
				exit(1)
			

	if args.mode == "enroll" or args.mode == "adduser":
		if user_info['userID'] == None and user_info['email'] == None:
			choice = raw_input("Lookup user by e-mail [e] or userID [u] ?:").lower()
			if choice == 'e':
				email = raw_input("Enter user's e-mail:").lower()
				user = backend.getUserByEmail(email)
			elif choice == 'u':
				userID = raw_input("Enter userID:").lower()
				user = backend.getUserByUserID(userID)
		elif user_info['userID'] != None:
			user = backend.getUserByUserID(user_info['userID'])
		else:
			user = backend.getUserByEmail(user_info['email'])
		if user != None:
			if args.mode != "adduser" and not args.noninteractive:
				confirmUser = raw_input("Found user [%d] %s %s. Use this person [y|n]: " % (user['userID'], user['firstName'], user['lastName']))
				if not confirmUser.lower() == 'y':
					print "Exiting"
					exit()
			userID = user['userID']
		else:
			print "User not found. Confirm info and try again or add a new user."
			exit()

		enroll = raw_input("Register NFC key? [y|n]:").lower()
		# @TODO need better input checking on both
		if enroll == 'y':
			choice = raw_input("Enter key UID manually [m] or read key from NFC reader [r] ?:").lower()
			if choice == 'm':
				nfcID = raw_input("Enter key UID:")
			elif choice == 'r':
				killDoorLock()
				interfaceControl.setPowerStatus(True)
				log.debug("Starting NFC read")
				print "Swipe card now"
				nfcID = interfaceControl.nfcGetUID()
				log.debug("Finished NFC read")
				interfaceControl.setPowerStatus(False)
				if restartDoorLock:
					startDoorLock()
			if nfcID != '':
				# @TODO: catch duplicate key error, exit with error status
				backend.enroll(nfcID, userID, args.steal)

				print "\nUser [%d] enrolled with ID: %s" % (userID, nfcID)
					
		elif enroll == 'n': 
			exit()	
			
finally:
	interfaceControl.cleanup()
	if restartDoorLock:
		startDoorLock()
