from PySide import QtCore, QtSql
import bcrypt

'''
	@requires libqt4-sql-psql
'''

_credentials = {
	'username': '',
	'password': '',
	'host': 'localhost',
	'db': 'master_control_program',
}

def setCredentials(**kwargs):
	global _credentials
	for k,v in kwargs.items():
		_credentials[k] = v

'''
	Convenience class to make binds more flexible

	Binding examples:
		Example 1 (positional binds with list):
			query = Query('INSERT INTO users (username, realName) VALUES (?, ?)')
			query.bind(['tester', 'Testy McTestface'])
			query.exec()
		Example 2 (positional binds without list):
			query = Query('INSERT INTO users (username, realName) VALUES (?, ?)')
			query.bind('tester', 'Testy McTestface')
			query.exec()
		Example 3 (explicit dict):
			query = Query('INSERT INTO users (username, realName) VALUES (:username, :realName)')
			args = {'username': 'tester', 'realName': 'Testy McTestFace'}
			query.bind(args)
			query.exec()
		Example 3 (argument dict):
			query = Query('INSERT INTO users (username, realName) VALUES (:username, :realName)')
			query.bind(username='tester', realName='Testy McTestFace')
			query.exec()
'''
class Option():
	def __init__(self, name, dataType, defaultValue, allowedValues=None, minimum=None, maximum=None):
		self.name = name
		self.type = dataType
		self.defaultValue = defaultValue
		self.allowedValues = allowedValues
		self.minimum = minimum
		self.maximum = maximum

class Query(QtSql.QSqlQuery):
	def __init__(self, sql, db=None):
		if db is not None:
			super().__init__(db)
		else:
			super().__init__()
		self.prepare(sql)

	def bind(self, *values, **kwargs):
		if len(values) > 0:
			if isinstance(values[0], dict):
				for k,v in values.items():
					self.bindValue(k, v)
			else:
				for v in values:
					if isinstance(v, (list, tuple)):
						self.bind(*v)
					else:
						self.addBindValue(v)

		for k,v in kwargs.items():
			self.bindValue(k, v)

	def exec_(self):
		if not super().exec_():
			raise Exception(self.lastError())
		return True

	def getAllRecords(self):
		records = []
		while self.next():
			records.append(self.getCurrentRecord())
		
		return records

	def getNextRecord(self):
		self.next()
		return self.getCurrentRecord()

	def getCurrentRecord(self):
		record = {}
		sqlRecord = self.record()
		for f in range(sqlRecord.count()):
			record[sqlRecord.fieldName(f)] = sqlRecord.value(f)

		return record
		

class Backend(QtCore.QObject):
	def __init__(self, connectionName=None):
		super().__init__()
		if connectionName is None:
			self.db = QtSql.QSqlDatabase.addDatabase('QPSQL')
		else:
			self.db = QtSql.QSqlDatabase.addDatabase('QPSQL', connectionName)

		self.db.setHostName(_credentials['host'])
		self.db.setDatabaseName(_credentials['db'])
		self.db.setUserName(_credentials['username'])
		self.db.setPassword(_credentials['password'])
		if not self.db.open():
			print('Failed to connect to database :(')
			raise Exception(self.db.lastError())

	def Query(self, sql):
		return Query(sql, self.db)

	def addUser(self, userDict):
		query = self.Query('INSERT INTO users ("email", "firstName", "lastName", "joinDate") VALUES (:email, :firstName, :lastName, :joinDate)')
		query.bind(userDict)
		return query.exec_()

	def updateUserPassword(self, email, password):
		hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt(8)).decode('utf-8')
		query = self.Query('UPDATE users SET "passwordHash" = ? WHERE "email" = ?')
		query.bind(email, hash)
		
		return query.exec_()

	def checkPassword(self, email, passwordAttempt):
		query = self.Query('SELECT "passwordHash" FROM users WHERE email = ?')
		query.bind(email)
		query.exec_()
		savedPassword = query.getNextRecord()['passwordHash']
		if savedPassword is None or savedPassword == '':
			return False
		else:
			return bcrypt.checkpw(passwordAttempt.encode('utf-8'), savedPassword.encode('utf-8'))

	def getPluginOption(self, pluginName, optionName):
		query = self.Query('''
			SELECT value
			FROM plugins
				JOIN "pluginOptions" ON plugins."pluginID" = "pluginOptions"."pluginID"
				LEFT JOIN "pluginOptionValues" ON "pluginOptions"."pluginOptionID" = "pluginOptionValues"."pluginOptionID"
			WHERE plugins.name = ?
				AND "pluginOptions".name = ?
			ORDER BY ordinal
		''')
		query.bind(pluginName, optionName)
		query.exec_()
		return query.getNextRecord()['value']

	def setPluginOption(self, pluginName, optionName, optionValue, **kwargs):
		query = self.Query('''
			UPDATE "pluginOptionValues" SET value = 'asdf'
			WHERE "pluginOptionID" = (
				SELECT "pluginOptionID" FROM "pluginOptions"
				WHERE name = 'pluginOptionName'
					AND "pluginID" = (SELECT "pluginID" FROM plugins WHERE name = 'asdf')
			)
		''')
		query.bind(**kwargs)
		query.exec_()
		if query.numRowsAffected() == 0:
			raise Exception('Could not set "%s" option of plugin "%s"' % (optionName, pluginName))

if __name__ == '__main__':
	import sys
	with open(sys.argv[1], 'r') as dbCredsFile:
		dbCreds = dbCredsFile.readline().split('\t')

	print('Setting credentials...')
	setCredentials(username=dbCreds[0].strip(), password=dbCreds[1].strip())
	print('Connecting...')
	database = Backend()
	print('Adding user...')
	try:
		database.addUser({
			'email': 'test@makeict.org',
			'firstName': 'Testy',
			'lastName': 'McTestface',
			'joinDate': None
		})
	except:
		print('User exists?')


	print('Updating password...')
	database.updateUserPassword('test@makeict.org', 'boogers')

	print('Checking password...')

	print(database.checkPassword('test@makeict.org', 'boogers'))

	print('Done!')
	app = QtCore.QCoreApplication([])
