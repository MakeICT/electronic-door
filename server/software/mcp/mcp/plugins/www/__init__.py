# -- coding: utf-8 --

import requests, uuid
from functools import partial

from flask import Flask, request, session, g, redirect, url_for, abort

import plugins, utils, events

_routes = {}
def _route(rule, **options):
	def decorator(f):
		_routes[rule] = f

	return decorator

# This is just a helper class to do basic Flask-y things
class FlaskPlugin(plugins.ThreadedPlugin):
	def __init__(self):
		super().__init__()
		self.app = Flask(__name__)
		self.killKey = str(uuid.uuid4()) # See _killServer

		self.systemEvent.emit(events.Ready(self))

		for r,f in _routes.items():
			fixedFunc = partial(f, self=self)
			self.app.add_url_rule(r, endpoint=f.__name__, view_func=fixedFunc)

	def run(self):
		self.app.run()

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
			if shutdown is None:
				raise RuntimeError('Not running with the Werkzeug Server')
			shutdown()
			return ''
		else:
			print('hack attempt?')

class Plugin(FlaskPlugin):
	@_route('/')
	def getRoot(self):
		return 'Hello, world'

	@_route('/<name>')
	def sayHi(self, name):
		return 'Hello, %s!' % name
