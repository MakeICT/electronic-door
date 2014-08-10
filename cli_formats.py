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


import signal, time, subprocess, argparse, logging, logging.config
from backend import backend
from prettytable import PrettyTable

class colors:
    HEADER = '\033[95m'
    OKBLUE = '\033[94m'
    OKGREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'

def putMessage(message, error=False, extra=''):
	width = 45
	ending = "!" if error else "|"
	formatString = "{:s}{:<" + str(width) + "s}{:s}{:s}{:s}"
	color = colors.WARNING if error else ''
	print  formatString.format(color,message,ending,extra,colors.ENDC)

def getInput(prompt, default=None, options=None):
	width = 45
	suggestion = ''
	if default:
		suggestion = '[{:s}]'.format(default)
		width-= len(suggestion)
	elif options:
		suggestion = '{' + '|'.join(options) + '}'
		width-= len(suggestion)
	formatString = '''{:<''' + str(width) + '''s}{:s}: '''
	userInput = raw_input(formatString.format(prompt, suggestion)).lower().strip()
	while (options) and (userInput not in options):
		putMessage("Invalid option!", error=True)
		userInput = raw_input(formatString.format(prompt, suggestion)).lower().strip()
	return userInput

if __name__ == "__main__":
	putMessage("this worked")
