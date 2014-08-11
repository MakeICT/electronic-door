#!/usr/bin/python
# -*- coding: utf-8 -*-
'''
MakeICT/Bluebird Arthouse Electronic Door Entry

unenroll.py: Unenrolls a user

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
from prettytable import PrettyTable
from cli_formats import *
from get_user import getUser

def unenroll():
	user = getUser()
	if not user:
		return
	if not user['rfids']:
		putMessage("User is not enrolled", True)
	else:
		putMessage("Found {:d} NFC card{:s}.".format(
			    len(user['rfids']), 's' if len(user['rfids']) > 1 else ''))
	for rfid in user['rfids']:
		if getInput("Remove NFC key with UID = {:s}?".format(rfid), options=['y','n']) == 'y':
			backend.unenroll(user['userID'], rfid)
			putMessage("Key un-enrolled")
