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
	parser = argparse.ArgumentParser(description='Add a user to the MakeICT database.')
	parser.add_argument("-u", "--user", help="The user's userID or e-mail address.")
	parser.add_argument("-n", "--noconfirm", action='store_true', help="Do not prompt for confirmation")
	args = parser.parse_args()

	try:
		getUser(args.user, args.noconfirm)
	except KeyboardInterrupt:
		pass
