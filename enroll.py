#!/usr/bin/python
# -*- coding: utf-8 -*-
'''
MakeICT/Bluebird Arthouse Electronic Door Entry

enroll.py: Enrolls a user
Usage: enroll.py userID [rfid]

Authors:
	Dominic Canare <dom@greenlightgo.org>
	Rye Kennedy <ryekennedy@gmail.com>
'''

import sys
import subprocess

from backend import backend

if len(sys.argv) > 1:
	userID = sys.argv[1]
else:
	email = raw_input("Email      : ")
	user = backend.getUserByEmail(email)
	if user != None:
		confirmUser = raw_input("Found user %d %s %s. Use this person [y|n]:" % (user['userID'], user['firstName'], user['lastName']))
		if not confirmUser.lower() == 'y':
			exit()

		userID = user['userID']
	else:
		print "User not found. Creating new user..."
		firstName = raw_input("First Name : ")
		lastName = raw_input("Last  Name : ")
		password = raw_input("Password   : ")
		
		userID = backend.addUser(email, firstName, lastName, password)
	
if len(sys.argv) >= 3:
	nfcID = sys.argv[2]
else:
	# @TODO: set LED states
	proc = subprocess.Popen("./nfc-read", stdout=subprocess.PIPE, shell=True)
	(nfcID, err) = proc.communicate()
	nfcID = nfcID.strip()
	# @TODO: set LED states
	
autoSteal = len(sys.argv) >= 4 and sys.argv[3] == 'steal':
if userID != "" and nfcID != "":
	# @TODO: catch duplicate key error, exit with error status
	backend.enroll(nfcID, userID, autoSteal)

