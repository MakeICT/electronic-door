#!/usr/bin/python
# -*- coding: utf-8 -*-
'''
MakeICT/Bluebird Arthouse Electronic Door Entry

get_user.py: Looks up a user and returns it

Authors:
	Dominic Canare <dom@greenlightgo.org>
	Rye Kennedy <ryekennedy@gmail.com>
	Christian Kindel <iceman81292@gmail.com>
'''

import signal, time, subprocess, argparse, logging, logging.config
from backend import backend
from cli_helper import *

def getUser(search=None, confirm=True):
	search = str(search) if search else None
	while True:
		if search == None:
			search = getInput("Enter E-mail or userID")
		elif search.isdigit():
			user = backend.getUserByUserID(search)
			break
		elif validateEmail(search):
			user = backend.getUserByEmail(search)
			break
		else:
			putMessage("Invalid search criteria.", level=severity.ERROR)
			search = None
	if user == None:
		putMessage("User not found. Confirm info and try again.", level=severity.WARNING)
	else:
		putMessage("Found user [{:d}] '{:s} {:s}'".format(user['userID'], user['firstName'], user['lastName']))
		if confirm:
			confirmUser = getInput("Use this person?", options=['y','n'] )
			if not confirmUser == 'y':
				return None
	return user

if __name__ == "__main__":
	getUser()
