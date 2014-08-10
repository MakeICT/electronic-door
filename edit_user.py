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
import signal, time, subprocess, argparse, logging, logging.config
from backend import backend
from cli_formats import *
from get_user import getUser

def editUser(userID=None, email=None):
	user = getUser()
	if not user:
		return

	availableTags = [tag['tag'] for tag in backend.getAvailableTags()]
	email = getInput("E-mail", user['email'])
	firstName = getInput("First Name",user['firstName'])
	lastName = getInput("Last Name", user['lastName'])
	tags = None
	defaultString = ", ".join(user['tags'])
	while tags == None:
		userInput = getInput("Tags",defaultString)
		if userInput == '':
			break
		tags = [x.strip() for x in userInput.split(',') if not x == '']
		for tag in tags:
			if tag not in availableTags:
				putMessage("Invalid tag '{:s}'".format(tag), True)
				tags = None
	password = getInput("Password")
	backend.updateUser(user['userID'], email=email, firstName=firstName, lastName=lastName, tags=tags, password=password)
	putMessage("Information for user [{:d}] has been updated".format(user['userID']))
