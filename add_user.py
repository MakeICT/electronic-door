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

import signal, time, argparse, logging, logging.config
from backend import backend
from get_user import getUser
from enroll2 import enroll
from cli_formats import *

availableTags = [tag['tag'] for tag in backend.getAvailableTags()]
def addUser(email=None, firstName=None, lastName=None, tags=None, password=None):

	if not email:
		email = getInput("E-mail")
	user = backend.getUserByEmail(email)
	if user:
		putMessage("User [{:d}] '{:s} {:s}' already exists. Exiting. ".format(user['userID'], user['firstName'], user['lastName']), True)
		return 1
	else:
		firstName = firstName if firstName else getInput("First Name")
		lastName = lastName if lastName else getInput("Last  Name")
		password = password if password else getInput("Password")
		while tags == None:
			userInput = getInput("Tags")
			if userInput == '':
				break
			tags = [x.strip() for x in userInput.split(',') if not x == '']
			for tag in tags:
				if tag not in availableTags:
					putMessage("Invalid tag '{:s}'".format(tag), True)
					tags = None
				
		userID = backend.addUser(email, firstName, lastName, password,tags)
		user = backend.getUserByUserID(userID)
		if userID != None:
			putMessage("User [{:d}] added to the database".format(userID), True)
			return 0
		else:
			putMessage("Failed to add user", True)
			return 1

if __name__ == "__main__":
	parser = argparse.ArgumentParser(description='Add a user to the MakeICT database.')
	parser.add_argument("-e", "--email", help="The user's email. This functions as the user's unique username.")
	parser.add_argument("-f", "--firstname", help="The user's first name.")
	parser.add_argument("-l", "--lastname", help="The user's last name.")
	parser.add_argument("-p", "--password", help="The user's password.")
	parser.add_argument("-t", "--tags", choices=availableTags, nargs='+')
	args = parser.parse_args()

	addUser(args.email, args.firstname, args.lastname, args.tags, args.password)
