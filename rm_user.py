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

import os
import signal, time, subprocess, argparse, logging, logging.config
from backend import backend
from get_user import getUser
from cli_formats import *

def rmUser(userID=None, email=None):
	user = getUser(userID, email)
	if not user:
		return

	putMessage("User [{:d}] '{:s} {:s}'" .format(user['userID'], user['firstName'], user['lastName']), True)
	putMessage("will be permanently deleted,", True)
	putMessage("along with all associated logs!", True)
	putMessage("Delete this User?", True)
	if getInput("{'yes' to continue, anything else to exit}")  == 'yes':
		putMessage("Really Delete?", True)
		if getInput("{'yes' to delete user, anything else to exit}") == 'yes':
			backend.rmUser(user['userID'])
			putMessage("User {:d}: '{:s} {:s}' has been deleted.".format(user['userID'], user['firstName'], user['lastName']), True)

if __name__ == "__main__":
	rmUser()
