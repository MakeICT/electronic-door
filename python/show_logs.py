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
from cli_helper import *

def showAllLogs(filters=None):
	logs = backend.getLogs(filters)
	if logs[0] == 1:
		putMessage('Invalid filter string', level=severity.ERROR)
		return
	else:
	 	logs = logs[1]
	fieldOrder = ['logID', 'timestamp', 'logType', 'userID', 'rfid', 'message']
#	fieldColored = [colors.HEADER + field + colors.ENDC for field in fieldOrder]
	fieldColored = fieldOrder

	logTable = PrettyTable(fieldColored)

	for log in logs:
		logTable.add_row([log[field] for field in fieldOrder])

	print logTable				
#	subprocess.call(['echo', "'{:}'".format(logTable.get_string(), '|', 'less', '-r'])

if __name__ == 	"__main__":
	parser = argparse.ArgumentParser(description='Show a user from the MakeICT database.')
	#@TODO: incorporate filter syntax into help usage
	parser.add_argument("-f", "--filters", nargs='+', help="Filter results. Syntax - attribute:value1,value2,..")
	args = parser.parse_args()

	try:
		showAllLogs(parseFilters(args.filters) if args.filters else None)
	except KeyboardInterrupt:
		pass
