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
	@param logType ('assign', 'activate', 'de-activate', 'unlock', 'deny', 'message', 'error')
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
	@returns False if fail, dict of user if success
	'''
	def attemptUnlock(self, key):
		query = '''
			SELECT * FROM users
				JOIN rfids ON users.userID = rfids.userID
			WHERE rfids.id = %s
				AND users.status = 'active''''
		self.cursor.execute(query, key)

		data = self.cursor.fetchone()
		if data != None:
			self.log('unlock', key, data['userID'])
		else:
			self.log('deny', key, data['userID'])

		return data

	'''
	@TODO: Document this method
	@TODO: Unit tests
	'''
	def enroll(self, key, userID, autoSteal=False):
		sql = '''
			INSERT INTO rfids
				(id, userID)
			VALUES (%(key)s, %(userID)s'''
		if autoSteal:
			sql = sql + ' ON DUPLICATE KEY UPDATE userID=%(userID)s'

		self.cursor.execute(sql, {'key': key, 'userID': userID })
		self.log('assign', key, userID)

backend = new MySQLBackend(
	host="localhost" ,db="MakeICTMemberKeys",
	user="MakeICTDBUser", passwd="2879fd3b0793d7972cbf7647bc1e62a4"
)
