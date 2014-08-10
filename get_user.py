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

import signal, time, subprocess, argparse, logging, logging.config
from backend import backend
from cli_formats import *

def getUser(userID=None, email=None, confirm=True):
	if userID == None and email == None:
		choice = getInput("Lookup user by e-mail or userID?", options = ['e', 'u'])
		if choice == 'e':
			email = getInput("Enter user's e-mail")
			user = backend.getUserByEmail(email)
		elif choice == 'u':
			userID = getInput("Enter userID")
			user = backend.getUserByUserID(userID)
	elif userID != None:
		user = backend.getUserByUserID(userID)
	else:
		user = backend.getUserByEmail(email)
		return None
	if user == None:
		putMessage("User not found. Confirm info and try again.")
	else:
		putMessage("Found user [{:d}] '{:s} {:s}'".format(user['userID'], user['firstName'], user['lastName']))
		if confirm:
			confirmUser = getInput("Use this person?", options=['y','n'] )
			if not confirmUser == 'y':
				return None
	return user
if __name__ == "__main__":
	getUser()
