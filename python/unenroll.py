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
from cli_helper import *
from get_user import getUser

def unenroll(user=None, nfcID=None, quiet=False, reader=False):
	user = getUser(user, False if user else True)
	if not user:
		return
	if not user['rfids']:
		putMessage("User is not enrolled", level=severity.WARNING)
		return
	else:
		putMessage("Found {:d} NFC card{:s}.".format(
			    len(user['rfids']), 's' if len(user['rfids']) > 1 else ''))
	if nfcID in user['rfids']:
		backend.unenroll(user['userID'], nfcID)
		putMessage('Removed key {:}'.format(nfcID), level=severity.OK)
		return
	for rfid in user['rfids']:
		if getInput("Remove NFC key with UID = {:s}?".format(rfid), options=['y','n']) == 'y':
			backend.unenroll(user['userID'], rfid)
			putMessage("Key un-enrolled", level=severity.OK)

if __name__ == "__main__":
	parser = argparse.ArgumentParser(description='Remove an NFC ID from a user in the MakeICT database.')
	parser.add_argument("-u", "--user", help="The user's userID or e-mail.", type=int)
#	parser.add_argument("-q", "--quiet", help="Suppress prompts and output", action="store_true")
	method = parser.add_mutually_exclusive_group()
	method.add_argument("-n", "--nfcid", help="UID of the user's NFC card.")
#	method.add_argument("-r", "--reader", help="Read a card UID from the card reader", action="store_true")
	args = parser.parse_args()

	try:
#		unenroll(args.user, args.nfcid, args.quiet, args.reader)
		unenroll(args.user, args.nfcid)
	except KeyboardInterrupt:
		pass
