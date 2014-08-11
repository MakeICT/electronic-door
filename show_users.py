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



def showUser(userID=None, email=None, filters=None, getAll=False):
	fieldOrder = ['userID', 'status', 'email', 'firstName', 'lastName', 'tags', 'rfids']
	def addUserRow(userDict):
		userTable.add_row([user[field] for field in fieldOrder])

	userTable = PrettyTable(fieldOrder)
	if getAll or filters:
		allUsers = backend.getAllUsers()
		if filters:
			for filt in filters:
				try:
					#@TODO: this is terrible fix it
					allUsers = [user for user in allUsers\
					if filters[filt] in ([user[filt]] if isinstance(user[filt], basestring)\
					else ([str(user[filt])] if isinstance(user[filt], long) else user[filt]))]
				except KeyError:
					return 1
		for user in allUsers:
			addUserRow(user)
	else:
		user = getUser(userID=None, email=None)
		if user:
			addUserRow(user)
#	userTable.sortby = 'tags'
	print userTable

if __name__ == "__main__":
	showUser()
