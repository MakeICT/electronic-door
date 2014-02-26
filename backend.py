#!/usr/bin/python
# -*- coding: utf-8 -*-
'''
MakeICT/Bluebird Arthouse Electronic Door Entry

backend.py - contains code for accessing/modifying the database

Authors:
	Dominic Canare <dom@greenlightgo.org>
	Rye Kennedy <ryekennedy@gmail.com>
'''

import MySQLdb, MySQLdb.cursors

class MySQLBackend(object, host, db, user, password):
	'''
	@TODO: Document this method
	'''
	def __init__(self, host, db, user, passsword):
		self.db = MySQLdb.connect(
			host=host ,db=db,
			user=db, passwd=password,
			cursorclass=MySQLdb.cursors.DictCursor
		)
		self.cursor = self.db.cursor()

	'''
	@TODO: Document this method
	@TODO: Unit tests
	'''
	def log(self, logType, rfid=None, userID=None, message=None, timestamp=None):
		query = '''
			INSERT INTO logs
				(timestamp, logType, rfid, userID, message)
			VALUES
				(%s, %s, %s, %s, %s)'''

		self.cursor.execute(query, timestamp, logType, rfid, userID, message)

	'''
	@TODO: Document this method
	'''
	def getUserFromKey(self, key):
		query = '''
			SELECT * FROM persons
				JOIN rfids ON persons.personID = rfids.personID
			WHERE rfids.id = %s'''
		self.cursor.execute(query, key)

		return self.cursor.fetchone()

backend = new MySQLBackend(
	host="localhost" ,db="MakeICTMemberKeys",
	user="MakeICTDBUser", passwd="2879fd3b0793d7972cbf7647bc1e62a4"
)
