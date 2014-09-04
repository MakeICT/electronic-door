#!/usr/bin/python
# -*- coding: utf-8 -*-
'''
MakeICT/Bluebird Arthouse Electronic Door Entry

show_user.py: Prints user info for one or more users in a table

Authors:
	Dominic Canare <dom@greenlightgo.org>
	Rye Kennedy <ryekennedy@gmail.com>
	Christian Kindel <iceman81292@gmail.com>
'''
import argparse, logging, logging.config
from backend import backend
from prettytable import PrettyTable
from get_user import getUser
from cli_helper import *


def showUser(userID=None, email=None, filters=None, getAll=False):
	fieldOrder = ['userID', 'status', 'email', 'firstName', 'lastName', 'tags', 'rfids']
	def addUserRow(userDict):
		userTable.add_row([user[field] for field in fieldOrder])

	userTable = PrettyTable(fieldOrder)
	if getAll or filters:
		allUsers = list(backend.getAllUsers())
		filteredUsers = []
		if filters:
			for filt in filters:
				try:
					filteredUsers = []
					for user in allUsers:
						user_value = str(user[filt]) if isinstance(user[filt], long) else user[filt]
						user_value = [user_value] if isinstance(user_value, basestring) else user_value
						filter_value = ([filters[filt]] if isinstance(filters[filt], basestring)
									   else filters[filt])
						match = True
						for f in filter_value:
							if f not in user_value:
								match = False
								break
						if match:
							filteredUsers.append(user)
							
					allUsers = filteredUsers
				except KeyError:
					return 1
		for user in allUsers:
			addUserRow(user)
	else:
		search = userID if userID else (email if email else None)
		user = getUser(search, confirm = False if search else True)
		if user:
			addUserRow(user)
#	userTable.sortby = 'tags'
	print userTable

if __name__ == "__main__":
	parser = argparse.ArgumentParser(description='Show a user from the MakeICT database.')
	lookup = parser.add_mutually_exclusive_group()
	lookup.add_argument("-u", "--userid", help="The user's unique userID.")
	lookup.add_argument("-e", "--email", help="The user's email.")
	lookup.add_argument("-a", "--all", help="Show all users in the database", action='store_true')
	#@TODO: incorporate filter syntax into help usage
	parser.add_argument("-f", "--filters", nargs='+', help="Filter results. Syntax - attribute:value1,value2,..")
	args = parser.parse_args()
	if args.filters and not args.all:
		putMessage("warning: Ignoring filters because -a/--all not specified",
				   level=severity.WARNING)
	filterDict = {}
	if args.filters and args.all:
		for f in args.filters:
			if ':' not in f:
				putMessage("error: Invalid filter syntax : '{:}'".format(f),
						   level=severity.ERROR)
				exit(1)
			oneFilter = [arg.strip() for arg in f.split(':')]
			if len(oneFilter) != 2:
				putMessage("error: Invalid filter syntax : '{:}'".format(f),
						   level=severity.ERROR)
				exit(1)
			if oneFilter[0] == 'tags':
				oneFilter[1] = [tag.strip() for tag in oneFilter[1].split(',')]
			filterDict[oneFilter[0].strip()] = oneFilter[1]
	
	try:
		showUser(args.userid, args.email, filterDict, args.all)
	except KeyboardInterrupt:
		pass
