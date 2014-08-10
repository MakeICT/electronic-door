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

availableTags = backend.getAvailableTags()
availableStatuses = backend.getAvailableStatuses()
def editUser(userID=None, email=None, firstName=None, lastName=None, status=None, tags=None, password=None):
	if userID or email:
		user = getUser(userID) if userID else getUser(email=email)
	else:
		user = None
	if user:
		putMessage("Found user [{:d}] '{:s} {:s}'".format(user['userID'], user['firstName'], user['lastName']), True)
		mode = 'edit'
	else:	
		putMessage("User does not exist. Adding new user.")
		mode = 'add'

	email = email if email else getInput("E-mail",
			user['email'] if user else '')
	firstName = firstName if firstName else getInput("First Name",
			user['firstName'] if user else '')
	lastName = lastName if lastName else getInput("Last  Name",
			user['lastName'] if user else '')
	while status == None:
		status = getInput("Status", user['status'] if user else '')
		if status == '':
			break
		if status not in availableStatuses:
			putMessage("Invalid status '{:s}'".format(status), True)
			status = None
	
	while tags == None:
		userInput = getInput("Tags", ", ".join(user['tags']) if user else '')
		if userInput == '':
			break
		tags = [x.strip() for x in userInput.split(',') if not x == '']
		for tag in tags:
			if tag not in availableTags:
				putMessage("Invalid tag '{:s}'".format(tag), True)
				tags = None
	
	password = password if password else getInput("Password", password = True)
	if password:
		confirmPassword = getInput("Confirm password", password = True)
		while password != confirmPassword:
			putMessage("Passwords do not match", True)
			password = getInput("Password", password =True)
			confirmPassword = getInput("Confirm password", password = True)
			
	
	if mode == 'add':		
		userID = backend.addUser(email, firstName, lastName, password,tags)
		user = backend.getUserByUserID(userID)
		if userID != None:
			putMessage("User [{:d}] added to the database".format(userID), True)
			return 0
		else:
			putMessage("Failed to add user", True)
			return 1
	else:
		backend.updateUser(user['userID'], email=email, firstName=firstName, 
				   lastName=lastName, status=status, tags=tags, password=password)
		putMessage("Information for user [{:d}] has been updated".format(user['userID']))

if __name__ == "__main__":
	parser = argparse.ArgumentParser(description='Add a user to the MakeICT database.')
	parser.add_argument("-u", "--userid", help="The user's unique userID.")
	parser.add_argument("-e", "--email", help="The user's email. This functions as the user's unique username.")
	parser.add_argument("-f", "--firstname", help="The user's first name.")
	parser.add_argument("-l", "--lastname", help="The user's last name.")
	parser.add_argument("-p", "--password", help="The user's password.")
	parser.add_argument("-t", "--tags", choices=availableTags, nargs='+')
	args = parser.parse_args()

	editUser(args.userid, args.email, args.firstname, args.lastname, args.tags, args.password)
