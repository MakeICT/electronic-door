# -- coding: utf-8 --

import requests, uuid, os
import json
from functools import partial, wraps

from flask import Flask, request, session, g, redirect, url_for, abort
from flask_socketio import SocketIO

import plugins, utils, events

'''
	@requires flask, flask_socketio, eventlet
'''

_routes = {}
def _route(rule, **options):
	def decorator(viewFunc):
		@wraps(viewFunc)		
		def wrapper(*args, **kwargs):
			return viewFunc(*args, **kwargs)

		_routes[rule] = (wrapper, options)
		return wrapper

	return decorator

# This is just a helper class to do basic Flask-y things
class FlaskPlugin(plugins.ThreadedPlugin):
	def __init__(self):
		super().__init__()

		self.app = Flask(__name__, static_url_path='')
		self.socketio = SocketIO(self.app)
		self.killKey = str(uuid.uuid4()) # See _killServer

		self.systemEvent.emit(events.Ready(self))

		print('Connecting rules...')
		for route,viewDetails in _routes.items():
			viewFunc, options = viewDetails
			fixedFunc = partial(viewFunc, self=self)
			if 'endpoint' not in options:
				options['endpoint'] = viewFunc.__name__
			self.app.add_url_rule(route, view_func=fixedFunc, **options)

	def run(self):
		self.socketio.run(self.app)

	def handleSystemEvent(self, event):
		super().handleSystemEvent(event)
		
		if isinstance(event, events.Exit):
			res = requests.get('http://localhost:5000/_KILL_SERVER/%s' % self.killKey)
	
	# Flask uses Werkzeug, and can only be shutdown with a request context
	# So when we want to shutdown flask, we have to send ourself a kill request
	# but we pass a key to make sure it's really us
	@_route('/_KILL_SERVER/<killKey>')
	def _killServer(self, killKey):
		if killKey == self.killKey:
			shutdown = request.environ.get('werkzeug.server.shutdown')
			if shutdown is not None:
				shutdown()
			return ''
		else:
			print('hack attempt?')

class Plugin(FlaskPlugin):
	@_route('/', endpoint='root')
	@_route('/<page>')
	def getPage(self, page=None):
		# other static files are served automatically
		return self.app.send_static_file('index.html')

	@_route('/api/login', methods=['POST'])
	def login(self):
		return ''

	@_route('/api/users/', methods=['GET'])
	def getUsers(self):
		results =[{
			"firstName": 'Test 1',
			"lastName": 'McTestFace'
		},{
			"firstName": 'Test 2',
			"lastName": 'McTestFace'
		}]

		return json.dumps(results)

	# API catch-all
	# This shouldn't really be here - Unimplemented API calls should 404, but the frontend mostly does silent fails on 404's
	@_route('/api/<path:path>', methods=['GET', 'POST', 'PUT'])
	def apiRequest(self, path):
		print(path)
		return '{"error":"%s not implemented", "detail":"This API endpoint has not been implemented"}' % path
