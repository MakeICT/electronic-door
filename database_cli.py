#!/usr/bin/python
# -*- coding: utf-8 -*-
'''
MakeICT/Bluebird Arthouse Electronic Door Entry
i
enroll.py: Enrolls a user
Usage: enroll.py [userID [rfid]]

Authors:
	Dominic Canare <dom@greenlightgo.org>
	Rye Kennedy <ryekennedy@gmail.com>
	Christian Kindel <iceman81292@gmail.com>
'''

from cmd import Cmd
from enroll import enroll
from unenroll import unenroll
from show_users import showUser
from get_user import getUser
from show_logs import showAllLogs
from edit_user import editUser
from rm_user import rmUser

class DatabaseCLI(Cmd):
	def __init__(self,completekey='tab', stdin=None, stdout=None):
		Cmd.__init__(self,completekey, stdin, stdout)
		self.prompt = "\033[1mDB_CMD>\033[0m "

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
				if args[1] == 'filter':
					filters = {args[2]: args[3]}
					if showUser(filters=filters) == 1:
						print "invalid filter"
			else:
				showUser(getAll=True)
	
	def do_adduser(self, args):
		editUser()

	def do_edituser(self, args):
		editUser(getUser()['userID'])

	def do_rmuser(self, args):
		rmUser()

	def do_enroll(self, args):
		enroll()

	def do_unenroll(self,args):
		unenroll()

	#@test
	def do_test(self,args):
		print args.split()

	def onecmd(self, s):
		try:	
			return Cmd.onecmd(self, s)
		except KeyboardInterrupt:
			print '\n'
