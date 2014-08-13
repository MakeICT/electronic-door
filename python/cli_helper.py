#!/usr/bin/python
# -*- coding: utf-8 -*-
'''
MakeICT/Bluebird Arthouse Electronic Door Entry

cli_helper.py: Contains helper functions and classes for cli I/O

Authors:
	Dominic Canare <dom@greenlightgo.org>
	Rye Kennedy <ryekennedy@gmail.com>
	Christian Kindel <iceman81292@gmail.com>
'''
import os, signal, time, subprocess, argparse, readline, logging, logging.config
from backend import backend
from prettytable import PrettyTable
from getpass import getpass

Dir = os.path.realpath(os.path.dirname(__file__))
historyFile = os.path.join(Dir, '.cli-history') 

class colors:
	NONE = ''
	HEADER = '\033[95m'
	OKBLUE = '\033[94m'
	OK = '\033[92m'
	WARNING = '\033[93m'
	ERROR = '\033[91m'
	ENDC = '\033[0m'

class severity:
	MESSAGE = 0
	OK = 1
	WARNING = 2
	ERROR = 3

#@TODO: document
def putMessage(message, extra='', level=severity.MESSAGE):
	'''
	'''
	def getColor(level):
		if level == severity.ERROR:
			return colors.ERROR
		elif level == severity.WARNING:
			return colors.WARNING
		elif level == severity.OK:
			return colors.OK
		else:
			return colors.NONE
	width = 45
	ending = "!" if level == severity.ERROR else "|"
	formatString = "{:s}{:<" + str(width) + "s}{:s}{:s}{:s}"
	color = getColor(level)
	print  formatString.format(color,message,ending,extra,colors.ENDC)
#@TODO: document
def getInput(prompt, default=None, options=None, password=False):
	'''
	'''
	readline.write_history_file(historyFile)
	readline.clear_history()
	try:
		width = 45
		suggestion = ''
		if default:
			suggestion = '[{:s}]'.format(default)
			width-= len(suggestion)
		elif options:
			suggestion = '{' + '|'.join(options) + '}'
			width-= len(suggestion)
		formatString = '''{:<''' + str(width) + '''s}{:s}: '''
		fullPrompt = formatString.format(prompt, suggestion)
		userInput = (raw_input(fullPrompt).lower().strip() if not password
			     else getpass(fullPrompt))
		readline.clear_history()
		while (options) and (userInput not in options):
			putMessage("Invalid option!",level = severity.ERROR)
			userInput = (raw_input(fullPrompt).lower().strip() if not password
				     else getpass(fullPrompt))
			
			readline.clear_history()
		readline.read_history_file(historyFile)
		userInput = userInput if userInput else None
		return userInput
	except KeyboardInterrupt:
		readline.read_history_file(historyFile)
		raise
#@TODO: document
def validateEmail(email):
	'''
	'''
	if not email:
		return False
	if '@' in email and '.' in email:
		return True
	else:
		return False

def parseFilters(filterString):
	filterDict = {}
	for f in filterString:
		if ':' not in f:
			putMessage("error: Invalid filter syntax : '{:}'".format(f),
					   level=severity.ERROR)
			return
		oneFilter = [arg.strip() for arg in f.split(':')]
		if len(oneFilter) != 2:
			putMessage("error: Invalid filter syntax : '{:}'".format(f),
					   level=severity.ERROR)
			return
		if oneFilter[0] == 'tags':
			oneFilter[1] = [tag.strip() for tag in oneFilter[1].split(',')]
		filterDict[oneFilter[0].strip()] = oneFilter[1]

	return filterDict
