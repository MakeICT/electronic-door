#!/usr/bin/python
# -*- coding: utf-8 -*-
'''
MakeICT/Bluebird Arthouse Electronic Door Entry

edit_user.py: Add/Edit user info in MakeICT database

Authors:
	Dominic Canare <dom@greenlightgo.org>
	Rye Kennedy <ryekennedy@gmail.com>
	Christian Kindel <iceman81292@gmail.com>
'''

import signal, time, argparse, logging, logging.config
from backend import backend
from get_user import getUser
from enroll import enroll
from cli_formats import *

validTags = backend.getValidTags()
validStatuses = backend.getValidStatuses()
def editUser(userID=None, email=None, firstName=None, lastName=None, status=None, tags=None, password=None):
	if userID or email:
		user = (backend.getUserByUserID(userID) if userID 
			else backend.getUserByEmail(email))
	else:
		user = None
	if user:
		putMessage("Editing user [{:d}] '{:s} {:s}'".format(user['userID'], user['firstName'], user['lastName']), True)
		putMessage("Enter new information to change.")
		putMessage("Enter '-' to delete stored info.")
		putMessage("Leave blank to leave stored info unchanged.")
		mode = 'edit'
	else:	
		putMessage("User does not exist. Adding new user.")
		mode = 'add'

	email = email if email else getInput("E-mail",
			user['email'] if user else '')
	email = '' if email == '-' else email
	firstName = firstName if firstName else getInput("First Name",
			user['firstName'] if user else '')
	firstName = '' if firstName == '-' else firstName
	lastName = lastName if lastName else getInput("Last  Name",
			user['lastName'] if user else '')
	lastName = '' if lastName == '-' else lastName
	while status == None:
		status = getInput("Status", user['status'] if user else '')
		if status == None or status == '-':
			break
		if status not in validStatuses:
			putMessage("Invalid status '{:s}'".format(status), True)
			status = None
	status = '' if status == '-' else status	

	while tags == None:
		userInput = getInput("Tags", ", ".join(user['tags']) if user else '')
		if userInput == None or userInput == '-':
			break
		tags = [x.strip() for x in userInput.split(',') if not x == '']
		if not tags:
			tags = None
			continue
		for tag in tags:
			if tag not in validTags:
				putMessage("Invalid tag '{:s}'".format(tag), True)
				tags = None
	tags = '' if userInput == '-' else tags
	password = password if password else getInput("Password", password = True)
	if password:
		confirmPassword = getInput("Confirm password", password = True)
		while password != confirmPassword:
			putMessage("Passwords do not match", True)
			password = getInput("Password", password =True)
			confirmPassword = getInput("Confirm password", password = True)
	password = '' if password == '-' else password
	if password == '':
		putMessage("Password will be removed!", True)
	
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
	parser.add_argument("-t", "--tags", choices=validTags, nargs='+')
	args = parser.parse_args()

	editUser(args.userid, args.email, args.firstname, args.lastname, args.tags, args.password)
