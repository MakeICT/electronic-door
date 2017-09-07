# -- coding: utf-8 --

import os
import json, html

import utils, events, plugins
from plugins import flasky

import flask

'''
	@requires flask, flask_socketio, eventlet, bcrypt
'''
class Plugin(flasky.FlaskPlugin):
	def __init__(self):
		root_dir = os.path.dirname(os.path.abspath(__file__))
		super().__init__(os.path.join(root_dir, 'static'))

	def errorToJSON(self, msg, detail):
		response = {
			'error': msg,
			'detail': '%s' % detail
		}

		return json.dumps(response)

	@flasky.route('/', endpoint='root')
	@flasky.route('/<path>')
	def getPage(self, path=None):
		return self.app.send_static_file('index.html')

	@flasky.route('/api/login', methods=['POST'])
	def login(self):
		return ''
		try:
			inputData = self._getRequestData()
			if inputData == '':
				raise Exception('No credentials provided')
			inputData = json.loads(inputData)
			if self.db.checkPassword(inputData['email'], inputData['password']):
				return ''
			else:
				raise Exception('Bad username or password')
		except Exception as exc:
			return self.errorToJSON('Login failed', exc)


	@flasky.route('/api/users/', methods=['GET'])
	def getUsers(self):
		# @TODO: replace this with a real call to the DB
		# @TODO: accept search parameters
		results =[{
			"firstName": 'Test 1',
			"lastName": 'McTestFace'
		},{
			"firstName": 'Test 2',
			"lastName": 'McTestFace'
		}]

		return json.dumps(results)

	@flasky.route('/api/plugins', methods=['GET'])
	def getPlugins(self):
		data = []
		for plugin in plugins.loadedPlugins:
			options = []
			for s in plugin.getOptions():
				option = s.__dict__.copy()
				options.append(option)

			data.append({
				'name': plugin.getName(),
				'enabled': plugin.isEnabled(),
				'options': options,
			})

		return json.dumps(data)

	@flasky.route('/api/plugins/<pluginName>/options/<optionName>', methods=['PUT'])
	def setPluginOption(self, pluginName, optionName):
		try:
			optionValue = self._getRequestData()
			plugin = plugins.getPluginByName(pluginName)
			plugin.setOption(optionName, optionValue)
			return ''
		except Exception as exc:
			print(exc)
			return self.errorToJSON('Could not save plugin option', exc)




	# API catch-all
	# This shouldn't really be here - Unimplemented API calls should 404, but the frontend mostly does silent fails on 404's
	@flasky.route('/api/<path:path>', methods=['GET', 'POST', 'PUT'])
	def apiRequest(self, path):
		inputData = self._getRequestData()
		return self.errorToJSON(
			'API endpoint not implemented',
			'"%s %s" not yet implemented :(' % (flask.request.method, flask.request.path)
		)
