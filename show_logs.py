#!/usr/bin/python
# -*- coding: utf-8 -*-
'''
MakeICT/Bluebird Arthouse Electronic Door Entry

show_logs.py: Prints logs from MakeICT database in a table.
Usage: enroll.py [userID [rfid]]

Authors:
	Dominic Canare <dom@greenlightgo.org>
	Rye Kennedy <ryekennedy@gmail.com>
	Christian Kindel <iceman81292@gmail.com>
'''


import subprocess, argparse, logging, logging.config
from backend import backend
from prettytable import PrettyTable

def showAllLogs():
	logs = backend.getLogs()
	fieldOrder = ['logID', 'timestamp', 'logType', 'userID', 'rfid', 'message']
#	fieldColored = [colors.HEADER + field + colors.ENDC for field in fieldOrder]
	fieldColored = fieldOrder

	logTable = PrettyTable(fieldColored)

	for log in logs:
		logTable.add_row([log[field] for field in fieldOrder])

	print logTable				
#	subprocess.call(['echo "' + logTable.get_string() + '" | less -r'], shell=True)
