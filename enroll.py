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


import os
if os.environ['USER'] != 'root':
	print "Root is required to run this script"
	exit()

import signal, time, subprocess, argparse, logging, logging.config
from backend import backend

availableTags = ['admin', 'makeict', 'bluebird']

parser = argparse.ArgumentParser(description='Enroll a user in the MakeICT database.')
parser.add_argument("mode", choices=['enroll', 'unenroll', 'adduser','edituser', 'rmuser'])
parser.add_argument("-u", "--userid", help="The user's unique userID.", type=int)
parser.add_argument("-e", "--email", help="The user's email. This functions as the user's unique username.")
parser.add_argument("-f", "--firstname", help="The user's first name.")
parser.add_argument("-l", "--lastname", help="The user's last name.")
parser.add_argument("-p", "--password", help="The user's password.")
parser.add_argument("-n", "--nfcid", help="UID of the user's NFC card.")
parser.add_argument("-s", "--steal", help="Re-assign the card if it is already registered to another user.", action="store_true")
parser.add_argument("-t", "--tags", choices=availableTags, nargs='+')
parser.add_argument("-N", "--noninteractive", help="Don't prompt for keyboard input", action="store_true")
args = parser.parse_args()

logging.config.fileConfig('/home/pi/code/makeictelectronicdoor/logging.conf')
log = logging.getLogger('enroll')

log.info('==========[enroll.py started]==========')
restartDoorLock = False


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

def getInput(prompt, default=''):
	length = 41
	if default:
		default = '[%s]'%default
		length -= len(default)
	formatString = '''%-''' + str(length) + '''s%s:'''
	return raw_input(formatString%(prompt, default)).lower().strip()
		

user_info = {'userID':args.userid, 'email':args.email, 'firstName':args.firstname, 'lastName':args.lastname, 'password':args.password, 'tags':args.tags}

if args.mode == 'rmuser' or args.mode == "edituser" or args.mode == "enroll" or args.mode == "unenroll":
	if user_info['userID'] == None and user_info['email'] == None:
		choice = getInput("Lookup user by e-mail [e] or userID [u] ?")
		if choice == 'e':
			email = getInput("Enter user's e-mail")
			user = backend.getUserByEmail(email)
		elif choice == 'u':
			userID = getInput("Enter userID")
			user = backend.getUserByUserID(userID)
	elif user_info['userID'] != None:
		user = backend.getUserByUserID(user_info['userID'])
	else:
		user = backend.getUserByEmail(user_info['email'])
	if user == None:
		print "User not found. Confirm info and try again."
		exit()
	else:
		print("\nFound user [%s] '%s %s'\n")%(user['userID'], user['firstName'], user['lastName'])
		confirmUser = getInput("Use this person? [y|n]" )
		if not confirmUser == 'y':
			print "\nExiting"
			exit()

if args.mode == "rmuser":
	print "User [%s] '%s %s' will be permanently deleted, along with all associated logs!"%(user['userID'], user['firstName'], user['lastName'])
	if getInput("Delete this user? [type 'yes' to continue, anything else to exit]")  == 'yes':
		if getInput("Really? [type 'yes' to delete user, anything else to exit]") == 'yes':
			backend.rmUser(user['userID'])
			print "\nUser %s: '%s %s' has been deleted."%(user['userID'], user['firstName'], user['lastName'])
			

if args.mode == "adduser":
	if user_info['email'] == None:
		user_info['email'] = getInput("E-mail")
	user = backend.getUserByEmail(user_info['email'])
	if user != None and args.mode == "adduser":
		print("User [%d] '%s %s' already exists. Exiting. " % (user['userID'], user['firstName'], user['lastName']))
		exit()
	else:
		user_info['firstName'] = getInput("First Name")
		user_info['lastName'] = getInput("Last  Name")
		user_info['password'] = getInput("Password")
		while user_info['tags'] == None:
			userInput = getInput("Tags").strip()
			if userInput == '':
				break
			user_info['tags'] = [x.strip() for x in userInput.split(',') if not x == '']
			print user_info['tags']
			for tag in user_info['tags']:
				if tag not in availableTags:
					print 'Invalid tag {%s}'%tag
					user_info['tags'] = None
				
		
		user_info['userID'] = backend.addUser(user_info['email'], user_info['firstName'], user_info['lastName'], user_info['password'], user_info['tags'])
		user = backend.getUserByUserID(user_info['userID'])
		if user_info['userID'] != None:
			print "\nUser [%d] added to the database" % user_info['userID']
		else:
			print "\nFailed to add user"
			exit(1)

if args.mode == "edituser":
	user_info['email'] = getInput("E-mail", user['email'])
	user_info['firstName'] = getInput("First Name",user['firstName'])
	user_info['lastName'] = getInput("Last Name", user['lastName'])
	defaultString = ", ".join(user['tags'])
	while user_info['tags'] == None:
		userInput = getInput("Tags",defaultString)
		if userInput == '':
			break
		user_info['tags'] = [x.strip() for x in userInput.split(',') if not x == '']
		for tag in user_info['tags']:
			if tag not in availableTags:
				print 'Invalid tag :', tag
				user_info['tags'] = None
	user_info['password'] = getInput("Password")
	backend.updateUser(user['userID'], email=user_info['email'], firstName=user_info['firstName'], lastName=user_info['lastName'], tags=user_info['tags'], password=user_info['password'])
	print "\nInformation for user [%s] has been updated"%user['userID']		

if args.mode == "unenroll":
	pass

if args.mode == "enroll" or args.mode == "adduser":
	userID = user['userID']

	if args.mode != 'enroll':	
		enroll = getInput("Register NFC key? [y|n]")
	# @TODO need better input checking on both
	if args.mode == 'enroll' or enroll == 'y':
		print             "Enter key UID manually      [m]"
		choice = getInput("or read key from NFC reader [r]")
		if choice == 'm':
			nfcID = getInput("Enter key UID")
		elif choice == 'r':
			try:
				from rpi import interfaceControl
				killDoorLock()
				while True:
					interfaceControl.setPowerStatus(True)
					log.debug("Starting NFC read")
					print "\nSwipe card now"
					nfcID = interfaceControl.nfcGetUID()
					log.debug("Finished NFC read")
					interfaceControl.setPowerStatus(False)
					if nfcID != None or getInput("\nCouldn't read card. Retry? [y|n]") != 'y':
						break
			finally:
				interfaceControl.cleanup()
				if restartDoorLock:
					startDoorLock()
		if nfcID != None:
			# @TODO: catch duplicate key error, exit with error status
			backend.enroll(nfcID, userID, args.steal)

			print "\nUser [%d] enrolled with ID: %s" % (userID, nfcID)
		else:
			print "\nDid not enroll user"
				
	elif enroll == 'n': 
		exit()	
