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

import os, subprocess, readline

Dir = os.path.realpath(os.path.dirname(__file__))
historyFile = os.path.join(Dir, '.cli-history')

class DatabaseCLI(Cmd):
	def __init__(self,completekey='tab', stdin=None, stdout=None):
		Cmd.__init__(self,completekey, stdin, stdout)
		self.prompt = "\001\033[1m\033[34m\002DB_CMD>\001\033[0m\002 "
		readline.read_history_file(historyFile)

	def emptyline(self):
		pass 	

	def callScript(self, command):
		args = command.split()
		args = [arg.strip() for arg in args if arg.strip()]
		subprocess.call(args)
		

	def do_showlogs(self, args):
		self.callScript("./show_logs.py " + args)

	def help_showlogs(self):
		subprocess.call(["./show_logs.py", "-h"])

	def do_showuser(self, args):
#		args = args.split()
#		if not args:
#			showUser()
#		elif args[0] == 'all':
#			if len(args) > 1:
#				if args[1] == 'filter' and len(args) == 4:
#					filters = {args[2]: args[3]}
#					if showUser(filters=filters) == 1:
#						putMessage(
#						"Invalid filter: '{:s}'".format(args[2]),
#						level=severity.ERROR)
#
#				elif args[1] == 'filter' and len(args) !=4:
#					putMessage("Wrong number of args",
#						   level=severity.ERROR)
#			else:
#				showUser(getAll=True)
		self.callScript("./show_user.py " + args)

	def help_showuser(self):
		subprocess.call(["./show_user.py", "-h"])
	
	def do_adduser(self, args):
		self.callScript("./edit_user.py " + args)

	def help_adduser(self):
		subprocess.call(["./edit_user.py", "-h"])

	def do_edituser(self, args):
		self.callScript("./edit_user.py " +  args)
	
	def help_edituser(self):
		subprocess.call(["./edit_user.py", "-h"])

	def do_rmuser(self, args):
		self.callScript("./rm_user.py " + args)
	
	def help_rmuser(self):
		subprocess.call(["./rm_user.py", "-h"])

	def do_enroll(self, args):
		self.callScript("sudo ./enroll.py " + args)
	
	def help_enroll(self):
		subprocess.call(["./enroll.py", "-h"])

	def do_unenroll(self,args):
		self.callScript("./unenroll.py " + args)

	def help_unenroll(self):
		subprocess.call(["./unenroll.py", "-h"])
	
	def do_exit(self, args):
		readline.write_history_file(historyFile)
		exit(0)

	def help_exit(self):
		print "close DB_CMD"


	def onecmd(self, s):
		try:	
			return Cmd.onecmd(self, s)
		except KeyboardInterrupt:
			#@TODO: this is a work-around, find out what's going on
			os.system("stty echo")
			print '\n'

	def cmdloop(self, intro=None):
		try:
			Cmd.cmdloop(self, intro)
		except KeyboardInterrupt:
			print "\nCaught Ctrl+C, exiting"
			self.do_exit('')

