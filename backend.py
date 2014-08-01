#!/usr/bin/python
# -*- coding: utf-8 -*-
'''
MakeICT/Bluebird Arthouse Electronic Door Entry

backend.py - contains code for accessing/modifying the database

Authors:
	Dominic Canare <dom@greenlightgo.org>
	Rye Kennedy <ryekennedy@gmail.com>

@TODO: Make proper use of transactions
	Note: transaction is started when the cursor is created, ended by db.commit|rollback
'''

import MySQLdb, MySQLdb.cursors

class MySQLBackend(object):
	'''
	@TODO: Document this method
	'''
	def __init__(self, host, db, user, passwd):
		self.db = MySQLdb.connect(
			host=host, db=db,
			user=user, passwd=passwd,
			cursorclass=MySQLdb.cursors.DictCursor
		)
		self.cursor = self.db.cursor()

	'''
	@TODO: Document this method
	@TODO: Unit tests
	@param logType ('assign', 'activate', 'de-activate', 'unlock', 'deny', 'message', 'error')
	'''
	def log(self, logType, rfid=None, userID=None, message=None, commit=True):
		sql = '''
			INSERT INTO logs
				(timestamp, logType, rfid, userID, message)
			VALUES
				(UNIX_TIMESTAMP(), %s, %s, %s, %s)'''

		self.cursor.execute(sql, (logType, rfid, userID, message))
		if commit:
			self.db.commit()

	'''
	@TODO: Document this method
	@returns False if fail, dict of user if success
	'''
	def attemptUnlock(self, key):
		sql = '''
			SELECT * FROM users
				JOIN rfids ON users.userID = rfids.userID
			WHERE rfids.id = %s
				AND users.status = \'active\'
			'''
		self.cursor.execute(sql, key)

		data = self.cursor.fetchone()
		if data != None:
			self.log('unlock', key, data['userID'])
		else:
			self.log('deny', key, data['userID'])

		return data

	'''
	@TODO: implement this. duh.
	'''
	def saltAndHash(self, data):
		return data

	'''
	@TODO: Document this method
	'''
	def getUserByEmail(self, email):
		self.cursor.execute('SELECT * FROM users WHERE email = %s', email)
		return self.cursor.fetchone()

	'''
	@TODO: Document this method
	'''
	def getUserFromKey(self, key):
		'''
		Look up user given a card id number

		Returns:
		Dictionary containing user information {'status', 'firstName',' lastName', 'email'}
		None if card is not registered to a user
		'''
		self.cursor.execute('SELECT userID FROM rfids WHERE id = %s', key)
		idCard = self.cursor.fetchone()
		if idCard == None:
			return None
		self.cursor.execute('SELECT status, firstName, lastName, email FROM users WHERE userID = %s', idCard['userID'])
			
		return self.cursor.fetchone()
	
	'''
	@TODO: Document this method
	@returns userID
	'''
	def addUser(self, email, firstName=None, lastName=None, password=None):
		sql = '''
			INSERT INTO users
				(email, firstName, lastName, passwordHash)
			VALUES
				(%s, %s, %s, %s)'''

		if password == '' or password == None:
			password = None
		else:
			password = self.saltAndHash(password)

		self.cursor.execute(sql, (email, firstName, lastName, password))

		self.db.commit()
		user = self.getUserByEmail(email)
		if user != None:
			return user['userID']

	'''
	@TODO: Document this method
	@TODO: Unit tests
	'''
	def enroll(self, key, userID, autoSteal=False):
		sql = '''
			INSERT INTO rfids
				(id, userID)
			VALUES (%(key)s, %(userID)s)'''
		if autoSteal:
			sql = sql + ' ON DUPLICATE KEY UPDATE userID=%(userID)s'

		self.cursor.execute(sql, {'key': key, 'userID': userID })
		self.log('assign', key, userID, commit=False)

		sql = 'UPDATE users SET status=\'active\' WHERE userID=%(userID)s';
		self.cursor.execute(sql, { 'userID': userID })
		self.log('activate', userID=userID, commit=False)
		
		self.db.commit()

backend = MySQLBackend(
	host="localhost" ,db="MakeICTMemberKeys",
	user="MakeICTDBUser", passwd="2879fd3b0793d7972cbf7647bc1e62a4"
)
