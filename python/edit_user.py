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
from cli_helper import *

validTags = backend.getValidTags()
validStatuses = backend.getValidStatuses()
def editUser(userID=None, email=None, firstName=None, lastName=None, status=None, tags=None, password=None):
	if userID or email:
		userSearch = userID if userID else email
		user = getUser(userSearch, confirm=False)
	else:
		user = None
	if user:
		putMessage("Editing user [{:d}] '{:s} {:s}'".format(
			user['userID'], user['firstName'], user['lastName']), level=severity.WARNING)
		putMessage("Enter new information to change.")
		putMessage("Leave blank to leave stored info unchanged.")
		mode = 'edit'
	elif email or (not email and not userID):
		putMessage("Adding new user")
		mode = 'add'
	else:
		return
	while email == None:
		email = getInput("e-mail", user['email'] if user else '')
		if email == None and mode == "edit":
			break
		if email == '-':
			message = ("Not a valid e-mail address" if mode == "add"
				   else "Cannot delete e-mail; edit instead.")
			putMessage(message, level=severity.ERROR)
			email = None
		elif not validateEmail(email):
			putMessage("Not a valid e-mail address", level=severity.ERROR)
			email = None
		else:
			if backend.getUserByEmail(email):
				putMessage("e-mail address is already in use!", level=severity.ERROR)
				email = None
	while firstName == None:
		firstName = firstName if firstName else getInput("First Name",
				user['firstName'] if user else '')
		if firstName == None and mode == 'edit':
			break
		elif firstName == None and mode == 'add':
			putMessage("This field is required", level=severity.ERROR)
	while lastName == None: 
		lastName = lastName if lastName else getInput("Last  Name",
				user['lastName'] if user else '')
		if lastName == None and mode == 'edit':
			break
		elif lastName == None and mode == 'add':
			putMessage("This field is required", level=severity.ERROR)
	while status == None:
		status = getInput("Status", user['status'] if user else '')
		if status == None:
			break
		if status == '-':
			putMessage("Cannot delete status; edit instead.", level=severity.ERROR)
			status = None
		elif status not in validStatuses:
			putMessage("Invalid status '{:s}'".format(status), level=severity.ERROR)
			status = None
	while tags == None:
		putMessage("Enter '-' to delete stored tags.")
		userInput = getInput("Tags", ", ".join(user['tags']) if user else '')
		if userInput == None:
			break
		if userInput == '-':
			tags = ''
			break
		tags = [x.strip() for x in userInput.split(',') if not x == '']
		if not tags:
			tags = None
			continue
		for tag in tags:
			if tag not in validTags:
				putMessage("Invalid tag '{:s}'".format(tag), level=severity.ERROR)
				tags = None
	if not password:
		putMessage("Enter '-' to delete stored password.")
		password = getInput("Password", password=True)
		if password:
			confirmPassword = getInput("Confirm password", password = True)
			while password != confirmPassword:
				putMessage("Passwords do not match", level=severity.ERROR)
				password = getInput("Password", password =True)
				confirmPassword = getInput("Confirm password", password = True)
	password = '' if password == '-' else password
	if password == '':
		putMessage("Password will be removed!", level=severity.WARNING)
	
	if mode == 'add':		
		userID = backend.addUser(email, firstName, lastName, password,tags)
		user = backend.getUserByUserID(userID)
		if userID != None:
			putMessage("User [{:d}] added to the database".format(userID), level=severity.OK)
			return 0
		else:
			putMessage("Failed to add user", level=severity.ERROR)
			return 1
	else:
		backend.updateUser(user['userID'], email=email, firstName=firstName, 
				   lastName=lastName, status=status, tags=tags, password=password)
		putMessage("Information for user [{:d}] has been updated".format(user['userID']),
			   level= severity.OK)

if __name__ == "__main__":
	parser = argparse.ArgumentParser(description='Add a user to the MakeICT database.')
	parser.add_argument("-u", "--userid", help="The user's userID.")
	parser.add_argument("-e", "--email", help="The user's e-mail address.")
	parser.add_argument("-f", "--firstname", help="The user's first name.")
	parser.add_argument("-l", "--lastname", help="The user's last name.")
	parser.add_argument("-p", "--password", help="The user's password.")
	parser.add_argument("-s", "--status", help="The user's status.", choices=validStatuses)
	parser.add_argument("-t", "--tags", choices=validTags, nargs='+')
	args = parser.parse_args()

	try:
		editUser(args.userid, args.email, args.firstname, args.lastname, args.status, args.tags, args.password)
	except KeyboardInterrupt:
		pass
