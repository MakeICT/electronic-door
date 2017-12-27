from PySide import QtCore, QtSql
import bcrypt
import re

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
			argList = ['tester', 'Testy McTestface']
			query.bind(argList)
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
		self.sql = sql
		if db is not None:
			super().__init__(db)
		else:
			super().__init__()
		self.prepare(sql)

	def bind(self, *values, **kwargs):
		if len(values) > 0:
			if isinstance(values[0], dict):
				for k,v in values[0].items():
					if k[0] != ':':
						k = ':%s' % k
					self.bindValue(k, v)
			else:
				for v in values:
					if isinstance(v, (list, tuple)):
						self.bind(*v)
					else:
						self.addBindValue(v)

		if len(kwargs) > 0:
			self.bind(kwargs)

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

	def Query(self, sql, *args, **kwargs):
		q = Query(sql, self.db)
		if len(args) > 0:
			q.bind(*args)
		if len(kwargs) > 0:
			q.bind(**kwargs)

		return q

	def getUsers(self, searchTerms):
		sql = 'SELECT * FROM users WHERE TRUE'
		params = []

		termSeparater = re.compile('((("[\w -]+")|([\w-]+)):)?(([\w-]+)|("([\w -]+)"))')
		matches = termSeparater.findall(searchTerms)

		for m in matches:
			if m[1] != '':
				tag = m[1].replace('"', '')
			else:
				tag = None

			q = m[4].replace('"', '')

			if tag is None:
				q = '%' + q + '%'

				for i in range(4):
					params.append(q)

				sql += '''
					AND (LOWER("firstName") LIKE ?
						OR LOWER("lastName") LIKE ?
						OR LOWER("email") LIKE ?
						OR LOWER("nfcID") LIKE ?
					)'''

			elif tag == 'group':
				params.append(q)
				sql += '''
					AND (SELECT 0 < COUNT(0) FROM "userGroups" JOIN "groups" ON "userGroups"."groupID" = groups."groupID"
						WHERE LOWER(groups.name) = ? AND "userGroups"."userID" = users."userID"
					)'''

			elif tag == 'tag':
				params.append(q)
				sql += '''
					AND (SELECT 0 < COUNT(0) FROM "userGroups"
								JOIN "groups" ON "userGroups"."groupID" = groups."groupID"
								JOIN "groupAuthorizationTags" ON "userGroups"."groupID" = "groupAuthorizationTags"."groupID"
								JOIN "authorizationTags" ON "authorizationTags"."tagID" = "groupAuthorizationTags"."tagID"
						WHERE LOWER("authorizationTags"."name") = ?
							AND "userGroups"."userID" = users."userID"
					)'''

			else:
				print('Unknown search verb: %s' % tag)

		query = self.Query(sql)
		query.bind(params)
		query.exec_()

		return query.getAllRecords()

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

	def setPluginOption(self, pluginName, optionName, optionValue):
		query = self.Query('''
			INSERT INTO "pluginOptionValues" (value, "pluginOptionID")
			VALUES (
				:optionValue,
				(
					SELECT "pluginOptionID" FROM "pluginOptions"
					WHERE name = :optionName
						AND "pluginID" = (SELECT "pluginID" FROM plugins WHERE name = :pluginName)
				)
			) ON CONFLICT ("pluginOptionID") DO UPDATE SET value = EXCLUDED.value
		''')
		query.bind({'pluginName': pluginName, 'optionName': optionName, 'optionValue': optionValue})
		query.exec_()
		if query.numRowsAffected() == 0:
			raise Exception('Could not set "%s" option of plugin "%s"' % (optionName, pluginName))

	def addPlugin(self, pluginName, options=[]):
		self.db.transaction()
		query = None
		try:
			query = self.Query('INSERT INTO plugins (name) VALUES (?)', pluginName)
			query.exec_()
			if query.numRowsAffected() == 1:
				pluginID = self.getPluginIDByName(pluginName)

				query = self.Query('INSERT INTO "pluginOptions" (name, type, ordinal, "pluginID") VALUES (:name, :type, :ordinal, :pluginID)', pluginID=pluginID)
				for ordinal, option in enumerate(options):
					params = {'name': option.name, 'type': option.type, 'ordinal': 10+ordinal}
					query.bind(params)
					query.exec_()
			
			self.db.commit()
			return self.getPluginIDByName(pluginName)
		except Exception as exc:
			self.db.rollback()
			raise(exc)

	def getPluginIDByName(self, name):
		query = self.Query('SELECT "pluginID" from plugins WHERE name = ?', name)
		query.exec_()
		if query.size() > 0:
			return query.getNextRecord()['pluginID']
		else:
			return None

	def getUserByEmail(self, email):
		q = self.Query('SELECT * FROM users WHERE email = ?', email)
		q.exec_()
		return q.getNextRecord()

	def checkUserAuth(self, userID, authTag):
		sql = '''
			SELECT COUNT(0) > 0 AS authorized
			FROM "groupAuthorizationTags" 
				JOIN "userGroups" ON "groupAuthorizationTags"."groupID" = "userGroups"."groupID"
				JOIN users ON "userGroups"."userID" = "users"."userID"
			WHERE users."userID" = ?
				AND users.status = \'active\'
				AND "tagID" = (SELECT "tagID" FROM "authorizationTags" WHERE name = ?)
		'''

		query = self.Query(sql, userID, authTag)
		query.exec_()
		return query.getNextRecord['authorized'] > 0

	def getAuthTags(self):
		query = self.Query('SELECT * FROM "authorizationTags" ORDER BY name')
		query.exec_()

		tags = []
		while query.next():
			tags.append(self.getCurrentRecord()['name'])

		return tags

	def getGroups(self):
		sql = '''
			SELECT
				groups.*,
				COUNT(users.*) AS count
			FROM groups
				LEFT JOIN "userGroups" ON "userGroups"."groupID" = "groups"."groupID"
				LEFT JOIN "users" ON "userGroups"."userID" = "users"."userID"
			GROUP BY groups."groupID"
			ORDER BY groups.name
		'''

		query = self.Query(sql)
		query.exec_()
		groups = query.getAllRecords()

		sql = '''
			SELECT
				"authorizationTags".name,
				(
					SELECT COUNT(0) > 0
					FROM "groupAuthorizationTags"
					WHERE "authorizationTags"."tagID" = "groupAuthorizationTags"."tagID"
						AND "groups"."groupID" = "groupAuthorizationTags"."groupID"
				) AS authorized
			FROM "authorizationTags" CROSS JOIN "groups"
			WHERE "groups"."groupID" = ?
			ORDER BY "authorizationTags".name;
		'''
		authTagQuery = self.Query(sql)

		for group in groups:
			authTagQuery.bind(group['groupID'])
			authTagQuery.exec_()
			group['authorizations'] = authTagQuery.getAllRecords()

		return groups

	def addGroup(self, name, description):
		query = self.Query('INSERT INTO groups (name, description) VALUES (?, ?)', name, description)
		query.exec_()

		query = self.Query('SELECT "groupID" FROM groups WHERE name = ?', name)
		query.exec_()
		
		return query.getNextRecord()['groupID']

	def setGroupAuthorization(self, groupID, authTag, onOrOff):
		if onOrOff:
			sql = '''
				INSERT INTO "groupAuthorizationTags" ("groupID", "tagID")
				VALUES (?, (SELECT "tagID" FROM "authorizationTags" WHERE name = ?))
			'''
		else:
			sql = '''
				DELETE FROM "groupAuthorizationTags"
				WHERE "groupID" = ?
					AND "tagID" = (SELECT "tagID" FROM "authorizationTags" WHERE name = ?)
			'''

		self.Query(sql, groupID, authTag).exec_()


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





