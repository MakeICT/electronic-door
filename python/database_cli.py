#!/usr/bin/python
# -*- coding: utf-8 -*-
'''
MakeICT/Bluebird Arthouse Electronic Door Entry
i
database_cli.py: The ClI interface for managing the database and door

Authors:
	Dominic Canare <dom@greenlightgo.org>
	Rye Kennedy <ryekennedy@gmail.com>
	Christian Kindel <iceman81292@gmail.com>
'''

from cmd import Cmd
from enroll import enroll
from unenroll import unenroll
from show_user import showUser
from get_user import getUser
from show_logs import showAllLogs
from edit_user import editUser
from rm_user import rmUser
from cli_helper import *

import subprocess

class DatabaseCLI(Cmd):
	def __init__(self,completekey='tab', stdin=None, stdout=None):
		Cmd.__init__(self,completekey, stdin, stdout)
		self.prompt = "\001\033[1m\033[34m\002DB_CMD>\001\033[0m\002 "

	def emptyline(self):
		pass 	

	def do_showlogs(self, args):
		showAllLogs()

	def do_showuser(self, args):
		args = args.split()
		if not args:
			showUser()
		elif args[0] == 'all':
			if len(args) > 1:
				if args[1] == 'filter' and len(args) == 4:
					filters = {args[2]: args[3]}
					if showUser(filters=filters) == 1:
						putMessage(
						"Invalid filter: '{:s}'".format(args[2]),
						level=severity.ERROR)

				elif args[1] == 'filter' and len(args) !=4:
					putMessage("Wrong number of args",
						   level=severity.ERROR)
			else:
				showUser(getAll=True)
	
	def do_adduser(self, args):
		editUser()

	def do_edituser(self, args):
		editUser(args if args else None)

	def do_rmuser(self, args):
		rmUser()

	def do_enroll(self, args):
#		enroll()
		subprocess.call(["sudo ./enroll.py"], shell=True)

	def do_unenroll(self,args):
		unenroll()
	
	def do_exit(self, args):
		exit(0)

	def onecmd(self, s):
		try:	
			return Cmd.onecmd(self, s)
		except KeyboardInterrupt:
			print '\n'

	def cmdloop(self, intro=None):
		try:
			Cmd.cmdloop(self, intro)
		except KeyboardInterrupt:
			print "\nCaught Ctrl+C, exiting"

