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
		while True:
			choice = getInput("Enter E-mail or userID")
			if choice.isdigit():
				user = backend.getUserByUserID(choice)
				break
			elif '@' in choice and '.' in choice:
				user = backend.getUserByEmail(choice)
				break
			else:
				putMessage("Invalid search criteria.", True)
	elif userID != None:
		user = backend.getUserByUserID(userID)
	else:
		user = backend.getUserByEmail(email)
	if user == None:
		putMessage("User not found. Confirm info and try again.", True)
	else:
		putMessage("Found user [{:d}] '{:s} {:s}'".format(user['userID'], user['firstName'], user['lastName']))
		if confirm:
			confirmUser = getInput("Use this person?", options=['y','n'] )
			if not confirmUser == 'y':
				return None
	return user

if __name__ == "__main__":
	getUser()
