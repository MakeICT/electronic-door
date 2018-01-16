# -- coding: utf-8 --

import os
import json, html

import utils, events, plugins
from plugins import flasky
from backend import Backend

import flask

# convenience method
def errorToJSON(msg, detail):
	response = {
		'error': msg,
		'detail': '%s' % detail
	}

	return json.dumps(response)

# convenience method
def unauthorizedJSON(auth=''):
	response = {
		'error': 'You are not authorized',
		'detail': 'User is not authorized (%s)' % auth
	}

	return json.dumps(response)

'''
	Converts objects to dicts
	useful for serialization
	https://stackoverflow.com/questions/1036409/recursively-convert-python-object-graph-to-dictionary
'''
def toDict(obj, classkey=None):
	if isinstance(obj, dict):
		data = {}
		for (k, v) in obj.items():
			data[k] = toDict(v, classkey)
		return data
	elif hasattr(obj, "_ast"):
		return toDict(obj._ast())
	elif hasattr(obj, "__iter__") and not isinstance(obj, str):
		return [toDict(v, classkey) for v in obj]
	elif hasattr(obj, "__dict__"):
		data = dict([(key, toDict(value, classkey)) 
			for key, value in obj.__dict__.items() 
			if not callable(value) and not key.startswith('_')])
		if classkey is not None and hasattr(obj, "__class__"):
			data[classkey] = obj.__class__.__name__
		return data
	else:
		return obj

'''
	@requires flask, flask_socketio, eventlet, bcrypt
'''
class Plugin(flasky.FlaskPlugin):
	def __init__(self):
		root_dir = os.path.dirname(os.path.abspath(__file__))
		super().__init__(os.path.join(root_dir, 'static'))

	def _loggedInUserToString(self):
		if 'user' in flask.session and flask.session['user'] is not None:
			return '"%(firstName)s %(lastName)s" <%(email)s>' % flask.session['user']
		else:
			return '<not logged in>'

	'''
		Static files for WWW browsers
	'''
	@flasky.route('/', endpoint='root')
	@flasky.route('/<path>')
	def getPage(self, path=None):
		return self.app.send_static_file('index.html')




	'''
		API: Authentication
	'''
	@flasky.route('/api/login/', methods=['POST', 'DEL'])
	def api_login(self):
		TEST_DEBUG = True
		if flask.request.method == 'POST':
			# login
			if TEST_DEBUG:
				flask.session['user'] = self.db.getUserByEmail('admin@makeict.org')

			else:
				try:
					inputData = self.getRequestDataDict()
					if inputData is None or inputData == '':
						raise Exception('No credentials provided')
					else:
						if self.db.checkPassword(inputData['email'], inputData['password']):
							flask.session['user'] = self.db.getUserByEmail(inputData['email'])
						else:
							raise Exception('Bad username or password')

				except Exception as exc:
					return errorToJSON('Login failed', exc)

			self.logger.info('LOGIN: %s from %s' % (self._loggedInUserToString(), flask.request.remote_addr))
			return ''

		else:
			# logout
			flask.session.pop('user', None)
			return ''

	# convenience function to check user authorization
	def checkUserAuth(self, authTag=None):
		if 'user' in flask.session and flask.session['user'] is not None:
			if authTag is None:
				return True
			else:
				return self.db.checkUserAuth(flask.session['user']['userID'], authTag)






	'''
		API: Users
	'''
	@flasky.route('/api/users/', methods=['GET', 'POST'])
	def api_userList(self):
		if not self.checkUserAuth():
			return unauthorizedJSON()

		if flask.request.method == 'GET':
			inputData = self.getRequestArgs()
			results = self.db.getUsers(inputData['q'])

			return json.dumps(results)

		elif flask.request.method == 'PUT':
			#@TODO: Implement user creation
			# create a user
			pass

		return errorToJSON(
			'API endpoint not implemented',
			'"%s %s" not yet implemented :(' % (flask.request.method, flask.request.path)
		)

	@flasky.route('/api/users/<userID>/', methods=['PUT'])
	def api_updateUser(self, userID):
		if not self.checkUserAuth():
			return unauthorizedJSON()

		self.db.updateUser(userID, self.getRequestDataDict())
		self.logger.info('Updated user %s by %s' % (userID, self._loggedInUserToString()))

		return ''

	@flasky.route('/api/users/<userID>/password/', methods=['PUT'])
	def api_updateUserPassword(self, userID):
		if not self.checkUserAuth():
			return unauthorizedJSON()

		#@TODO: Implement this function
		return errorToJSON(
			'API endpoint not implemented',
			'"%s %s" not yet implemented :(' % (flask.request.method, flask.request.path)
		)

	@flasky.route('/api/users/<userID>/groups/', methods=['GET'])
	def api_getUserGroups(self, userID):
		if not self.checkUserAuth():
			return unauthorizedJSON()

		#@TODO: Implement this function
		return errorToJSON(
			'API endpoint not implemented',
			'"%s %s" not yet implemented :(' % (flask.request.method, flask.request.path)
		)

	@flasky.route('/api/users/<userID>/groups/<groupName>/', methods=['GET'])
	def api_getUserGroupStatus(self, userID, groupName):
		if not self.checkUserAuth():
			return unauthorizedJSON()

		#@TODO: Implement this function
		return errorToJSON(
			'API endpoint not implemented',
			'"%s %s" not yet implemented :(' % (flask.request.method, flask.request.path)
		)

	@flasky.route('/api/users/<userID>/nfcHistory/', methods=['GET'])
	def api_getUserNFCHistory(self, userID):
		if not self.checkUserAuth():
			return unauthorizedJSON()

		#@TODO: Implement this function
		return errorToJSON(
			'API endpoint not implemented',
			'"%s %s" not yet implemented :(' % (flask.request.method, flask.request.path)
		)





	'''
		API: Groups
	'''
	@flasky.route('/api/groups/', methods=['GET', 'POST'])
	def api_groupList(self):
		if not self.checkUserAuth():
			return unauthorizedJSON()

		#@TODO: Implement this function
		if flask.request.method == 'GET':
			return json.dumps(self.db.getGroups())

		elif flask.request.method == 'POST':
			try:
				data = self.getRequestDataDict()
				groupID = self.db.addGroup(data['name'], data['description'])
				return groupID

			except Exception as exc:
				return errorToJSON('Failed to create new group :(', exc)
		
	@flasky.route('/api/groups/<groupID>/', methods=['PUT'])
	def api_updateGroup(self, groupID):
		if not self.checkUserAuth():
			return unauthorizedJSON()

		#@TODO: Implement this function
		return errorToJSON(
			'API endpoint not implemented',
			'"%s %s" not yet implemented :(' % (flask.request.method, flask.request.path)
		)

	@flasky.route('/api/groups/<groupID>/authorizations/<authTag>/', methods=['PUT', 'DELETE'])
	def api_groupAuthTags(self, groupID, authTag):
		if not self.checkUserAuth():
			return unauthorizedJSON()

		self.db.setGroupAuthorization(groupID, authTag, flask.request.method == 'PUT')

		return ''




	'''
		API: Plugins
	'''
	@flasky.route('/api/plugins/', methods=['GET'])
	def api_getPlugins(self):
		if not self.checkUserAuth():
			return unauthorizedJSON()

		data = []
		for plugin in plugins.loadedPlugins:
			record = {
				'name': plugin.getName(),
				'enabled': plugin.isEnabled(),
				'options': [],
				'actions': [],
				'canBeAssociatedToClients': isinstance(plugin, plugins.ClientPlugin)
			}

			for s in plugin.options:
				option = toDict(s)
				option['value'] = plugin.getOption(option['name'])
				record['options'].append(option)

			for a in plugin.actions:
				record['actions'].append(toDict(a))

			data.append(record)

		return json.dumps(data)

	@flasky.route('/api/plugins/<pluginName>/enabled/', methods=['GET'])
	def api_getPluginStatus(self, pluginName):
		if not self.checkUserAuth():
			return unauthorizedJSON()

		#@TODO: Implement this function
		return errorToJSON(
			'API endpoint not implemented',
			'"%s %s" not yet implemented :(' % (flask.request.method, flask.request.path)
		)
		
	@flasky.route('/api/plugins/<pluginName>/options/<optionName>/', methods=['PUT'])
	def api_savePluginOptionValue(self, pluginName, optionName):
		if not self.checkUserAuth():
			return unauthorizedJSON()

		try:
			optionValue = self.getRequestData()
			plugin = plugins.getPluginByName(pluginName)
			plugin.setOption(optionName, optionValue)

			return ''

		except Exception as exc:
			self.logger.error('Could not save plugin option (%s)' % exc)
			return errorToJSON('Could not save plugin option', exc)
		
	@flasky.route('/api/plugins/<pluginName>/actions/<actionName>/', methods=['POST'])
	def api_executePluginAction(self, pluginName, actionName):
		if not self.checkUserAuth():
			return unauthorizedJSON()

		for p in plugins.loadedPlugins:
			if p.getName() == pluginName:
				p.doAction(actionName, self.getRequestDataDict())
				break
		else:
			return errorToJSON(
				'Unknown plugin',
				'I don\'t know what "%s" is :(' % pluginName
			)

		return ''

	@flasky.route('/api/plugins/<pluginName>/handler/', methods=['GET'])
	def api_routeRequestToPlugin(self, pluginName):
		if not self.checkUserAuth():
			return unauthorizedJSON()

		#@TODO: Implement this function
		return errorToJSON(
			'API endpoint not implemented',
			'"%s %s" not yet implemented :(' % (flask.request.method, flask.request.path)
		)





	'''
		API: Clients
	'''
	@flasky.route('/api/clients/', methods=['GET'])
	def api_getClients(self):
		if not self.checkUserAuth():
			return unauthorizedJSON()

		clients = self.db.getClients()
		for c in clients:
			c['plugins'] = self.db.getClientPlugins(c['clientID'])

			for cp in c['plugins']:
				for loadedPlugin in plugins.loadedPlugins:
					if cp['pluginID'] == loadedPlugin.pluginID:
						cp['options'] = []
						for option in loadedPlugin.getClientOptions(c['clientID']):
							# convert to dict so it can be json-serialized
							cp['options'].append(toDict(option))

						cp['actions'] = []
						for a in loadedPlugin.clientActions:
							cp['actions'].append(toDict(a))


		return json.dumps(clients)
		
	@flasky.route('/api/clients/<clientID>/', methods=['GET', 'PUT'])
	def api_clientDetails(self, clientID):
		if not self.checkUserAuth():
			return unauthorizedJSON()

		#@TODO: Implement this function
		if flask.request.method == 'GET':
			#@TODO: implement this 
			return errorToJSON(
				'API endpoint not implemented',
				'"%s %s" not yet implemented :(' % (flask.request.method, flask.request.path)
			)

		elif flask.request.method == 'PUT':
			data = self.getRequestDataDict()
			self.db.updateClient(data['oldID'], data)
			return ''

	@flasky.route('/api/clients/<clientID>/plugins/<pluginName>/', methods=['PUT', 'POST', 'DELETE'])
	def api_clientPluginAssociation(self, clientID, pluginName):
		if not self.checkUserAuth():
			return unauthorizedJSON()

		#@TODO: Implement this functionp
		if flask.request.method == 'POST':
			self.db.associateClientPlugin(clientID, pluginName)

		elif flask.request.method == 'DELETE':
			self.db.disassociateClientPlugin(clientID, pluginName)

		elif flask.request.method == 'PUT':
			data = self.getRequestDataDict()
			self.db.setPluginOption(pluginName, data['option'], data['value'], clientID)

		return ''

	@flasky.route('/api/clients/<clientID>/plugins/<pluginName>/actions/<actionName>/', methods=['POST'])
	def api_executePluginActionOnClient(self, clientID, pluginName, actionName):
		if not self.checkUserAuth():
			return unauthorizedJSON()

		for p in plugins.loadedPlugins:
			if p.getName() == pluginName:
				p.doAction(actionName, self.getRequestDataDict(), clientID)
				break
		else:
			return errorToJSON(
				'Unknown plugin',
				'I don\'t know what "%s" is :(' % pluginName
			)

		return ''




	'''
		API: Logs and jobs
	'''
	@flasky.route('/api/log/', methods=['GET'])
	def api_getLog(self):
		if not self.checkUserAuth():
			return unauthorizedJSON()

		#@TODO: Implement this function
		return errorToJSON(
			'API endpoint not implemented',
			'"%s %s" not yet implemented :(' % (flask.request.method, flask.request.path)
		)
		
	@flasky.route('/api/scheduledJobs/', methods=['GET', 'POST'])
	def api_scheduledJobList(self):
		if not self.checkUserAuth():
			return unauthorizedJSON()

		#@TODO: Implement this function
		if flask.request.method == 'GET':
			# get scheduled jobs
			pass
		elif flask.request.method == 'POST':
			# create scheduled job
			pass

		return errorToJSON(
			'API endpoint not implemented',
			'"%s %s" not yet implemented :(' % (flask.request.method, flask.request.path)
		)
		
	@flasky.route('/api/scheduledJobs/<jobID>/', methods=['PUT', 'DELETE'])
	def api_updateScheduledJob(self, jobID):
		if not self.checkUserAuth():
			return unauthorizedJSON()

		#@TODO: Implement this function
		if flask.request.method == 'PUT':
			# update scheduled job
			pass
		elif flask.request.method == 'DELETE':
			# remove scheduled job
			pass

		return errorToJSON(
			'API endpoint not implemented',
			'"%s %s" not yet implemented :(' % (flask.request.method, flask.request.path)
		)
		
	@flasky.route('/api/scheduledJobs/<jobID>/enabled/', methods=['PUT'])
	def api_setScheduledJobEnabledStatus(self, jobID):
		if not self.checkUserAuth():
			return unauthorizedJSON()

		#@TODO: Implement this function
		return errorToJSON(
			'API endpoint not implemented',
			'"%s %s" not yet implemented :(' % (flask.request.method, flask.request.path)
		)




	'''
		API: Catch-all
		@TODO: this should be deleted, let unrecognized requests 404, and let the client handle it appropriately
	'''
#	@flasky.route('/api/<path:path>', methods=['GET', 'POST', 'PUT'])
#	def apiRequest(self, path):
#		return errorToJSON(
#			'Unknown endpoint',
#			'%s: %s' % (flask.request.method, flask.request.path)
#		)
