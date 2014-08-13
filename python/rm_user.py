#!/usr/bin/python
# -*- coding: utf-8 -*-
'''
MakeICT/Bluebird Arthouse Electronic Door Entry

rm_user.py: Deletes a user from the database. Unnecessary and shouldn't be used.

Authors:
	Dominic Canare <dom@greenlightgo.org>
	Rye Kennedy <ryekennedy@gmail.com>
	Christian Kindel <iceman81292@gmail.com>
'''

import os
import signal, time, subprocess, argparse, logging, logging.config
from backend import backend
from get_user import getUser
from cli_helper import *

def rmUser(user=None):
	user = getUser(user)
	if not user:
		return

	putMessage("User [{:d}] '{:s} {:s}'" .format(user['userID'], user['firstName'], user['lastName']), level=severity.WARNING)
	putMessage("will be permanently deleted,", level=severity.WARNING)
	putMessage("along with all associated logs!", level=severity.WARNING)
	putMessage("Delete this User?", level=severity.WARNING)
	if getInput("{'yes' to continue, anything else to exit}")  == 'yes':
		putMessage("Really Delete?", level=severity.WARNING)
		if getInput("{'yes' to delete user, anything else to exit}") == 'yes':
			backend.rmUser(user['userID'])
			putMessage("User {:d}: '{:s} {:s}' has been deleted.".format(user['userID'], user['firstName'], user['lastName']), level=severity.WARNING)

if __name__ == "__main__":
	parser = argparse.ArgumentParser(description='Add a user to the MakeICT database.')
	parser.add_argument("-u", "--user", help="The user's userID or e-mail address.")
	args = parser.parse_args()

	try:
		rmUser(args.user)
	except KeyboardInterrupt:
		pass
