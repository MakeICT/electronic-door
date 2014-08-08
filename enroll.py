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
parser.add_argument("mode", choices=['enroll', 'unenroll', 'adduser','edituser', 'showuser', 'rmuser'])
parser.add_argument("-u", "--userid", help="The user's unique userID.", type=int)
parser.add_argument("-e", "--email", help="The user's email. This functions as the user's unique username.")
parser.add_argument("-f", "--firstname", help="The user's first name.")
parser.add_argument("-l", "--lastname", help="The user's last name.")
parser.add_argument("-p", "--password", help="The user's password.")
parser.add_argument("-n", "--nfcid", help="UID of the user's NFC card.")
parser.add_argument("-s", "--steal", help="Re-assign the card if it is already registered to another user.", action="store_true")
parser.add_argument("-t", "--tags", choices=availableTags, nargs='+')
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

def getInput(prompt, default=None, options=None):
	width = 45
	suggestion = ''
	if default:
		suggestion = '[%s]'%default
		width-= len(suggestion)
	elif options:
		suggestion = '{' + '|'.join(options) + '}'
		width-= len(suggestion)
	formatString = '''%-''' + str(width) + '''s%s: '''
	userInput = raw_input(formatString%(prompt, suggestion)).lower().strip()
	while (options) and (userInput not in options):
		putMessage("Invalid option!", error=True)
		userInput = raw_input(formatString%(prompt, suggestion)).lower().strip()
	return userInput

def putMessage(message, error=False, extra=''):
	width = 45
	ending = "!" if error else "|"
	formatString = '''%-''' + str(width) + '''s%s%s'''
	print formatString%(message,ending,extra)

user_info = {'userID':args.userid, 'email':args.email, 'firstName':args.firstname, 'lastName':args.lastname, 'password':args.password, 'tags':args.tags}

if args.mode != "adduser":
	if user_info['userID'] == None and user_info['email'] == None:
		choice = getInput("Lookup user by e-mail or userID?", options = ['e', 'u'])
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
		putMessage("User not found. Confirm info and try again.")
		exit()
	else:
		putMessage("Found user [%s] '%s %s'"%(user['userID'], user['firstName'], user['lastName']))
		confirmUser = getInput("Use this person?", options=['y','n'] )
		if not confirmUser == 'y':
			putMessage=("Exiting")
			exit()

if args.mode == "showuser":
	maxLength = maxFieldLength = 0
	fieldOrder = ['userID', 'status', 'email', 'firstName', 'lastName', 'tags', 'rfids']
	for field in fieldOrder:
		length = len(str(user[field]))
		maxLength = length if length > maxLength else maxLength
		fieldLength = len(field)
		maxFieldLength = fieldLength if fieldLength > maxFieldLength else maxFieldLength

	width = maxFieldLength + maxLength
	n=2
	def printRow(field):
		print ("{:-<" +str(width+n+1) + "s}").format('')
		formatString = "|{:<" +str(width+1) + "s}|"
		valueString = ("{:<" + str(maxFieldLength) + "s}|{:s}").format(field, str(user[field]))
		print(formatString.format(valueString))
	for field in fieldOrder:
		printRow(field)
	print ("{:-<" +str(width+n+1) + "s}").format('')
	pass

if args.mode == "rmuser":
	putMessage("User [%s] '%s %s'" %(user['userID'], user['firstName'], user['lastName']), True)
	putMessage("will be permanently deleted,", True)
	putMessage("along with all associated logs!", True)
	putMessage("Delete this User?", True)
	if getInput("{'yes' to continue, anything else to exit}")  == 'yes':
		putMessage("Really Delete?", True)
		if getInput("{'yes' to delete user, anything else to exit}") == 'yes':
			backend.rmUser(user['userID'])
			putMessage("User %s: '%s %s' has been deleted."%(user['userID'], user['firstName'], user['lastName']), True)
			

if args.mode == "adduser":
	if user_info['email'] == None:
		user_info['email'] = getInput("E-mail")
	user = backend.getUserByEmail(user_info['email'])
	if user != None and args.mode == "adduser":
		putMessage("User [%d] '%s %s' already exists. Exiting. " % (user['userID'], user['firstName'], user['lastName']), True)
		exit()
	else:
		user_info['firstName'] = getInput("First Name")
		user_info['lastName'] = getInput("Last  Name")
		user_info['password'] = getInput("Password")
		while user_info['tags'] == None:
			userInput = getInput("Tags")
			if userInput == '':
				break
			user_info['tags'] = [x.strip() for x in userInput.split(',') if not x == '']
			for tag in user_info['tags']:
				if tag not in availableTags:
					putMessage('Invalid tag {%s}'%tag, True)
					user_info['tags'] = None
				
		
		user_info['userID'] = backend.addUser(user_info['email'], user_info['firstName'], user_info['lastName'], user_info['password'], user_info['tags'])
		user = backend.getUserByUserID(user_info['userID'])
		if user_info['userID'] != None:
			putMessage("User [%d] added to the database"%user_info['userID'], True)
			if getInput("Register NFC key?", options=['y','n']) == 'n':
				exit()
		else:
			putMessage("Failed to add user", True)
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
				putMessage('Invalid tag {%s}'%tag, True)
				user_info['tags'] = None
	user_info['password'] = getInput("Password")
	backend.updateUser(user['userID'], email=user_info['email'], firstName=user_info['firstName'], lastName=user_info['lastName'], tags=user_info['tags'], password=user_info['password'])
	putMessage("Information for user [%s] has been updated"%user['userID'])

if args.mode == "unenroll":
	if not user['rfids']:
		putMessage("User [{:d}] '{:s} {:s}' is not enrolled".format(user['userID'], user['firstName'], user['lastName']), True)

if args.mode == "enroll" or args.mode == "adduser":
	userID = user['userID']

	putMessage(       "Enter key UID manually,")
	choice = getInput("or read key from NFC reader?", options=['m', 'r'])
	if choice == 'm':
		nfcID = getInput("Enter key UID")
	else:
		try:
			from rpi import interfaceControl
			killDoorLock()
			while True:
				interfaceControl.setPowerStatus(True)
				log.debug("Starting NFC read")
				putMessage("Swipe card now")
				nfcID = interfaceControl.nfcGetUID()
				log.debug("Finished NFC read")
				interfaceControl.setPowerStatus(False)
				if nfcID != None or getInput("Couldn't read card. Retry?", options=['y', 'n']) != 'y':
					break
		finally:
			interfaceControl.cleanup()
			if restartDoorLock:
				startDoorLock()
	if nfcID != None:
		# @TODO: catch duplicate key error, exit with error status
		backend.enroll(nfcID, userID, args.steal)

		putMessage("User [%d] enrolled with ID: %s" % (userID, nfcID))
	else:
		putMessage("Did not enroll user", True)
				
