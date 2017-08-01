import requests, uuid
from functools import partial, wraps

from flask import Flask, request
from flask_socketio import SocketIO

from mcp import plugins, events, backend

_routes = {}
def route(rule, **options):
	@wraps(rule)
	def decorator(viewFunc):
#		print('Wrapping %s => %s' % (rule, viewFunc))
		@wraps(viewFunc)		
		def wrapper(*args, **kwargs):
			return viewFunc(*args, **kwargs)

		_routes[rule] = (wrapper, options)
		return wrapper

	return decorator

# This is just a helper class to do basic Flask-y things
class FlaskPlugin(plugins.ThreadedPlugin):
	def __init__(self, staticFolder):
		super().__init__()

		self.app = Flask(__name__, static_url_path='', static_folder=staticFolder)
		self.socketio = SocketIO(self.app)
		self.killKey = str(uuid.uuid4()) # See _killServer

		self.systemEvent.emit(events.Ready(self))

		for route,viewDetails in _routes.items():
			viewFunc, options = viewDetails
			fixedFunc = partial(viewFunc, self=self)
			if 'endpoint' not in options:
				options['endpoint'] = viewFunc.__name__
			#print('Connecting %s' % (route))
			self.app.add_url_rule(route, view_func=fixedFunc, **options)

	def defineOptions(self):
		self.options.append(
			backend.Option(name='port', dataType='number', defaultValue=None, minimum=0, maximum=65535),
		)

	def run(self):
		self.socketio.run(self.app)

	def handleSystemEvent(self, event):
		super().handleSystemEvent(event)
		
		if isinstance(event, events.Exit):
			res = requests.get('http://localhost:5000/_KILL_SERVER/%s' % self.killKey)

	def _getRequestData(self):
		return request.data.decode('utf-8')
	# Flask uses Werkzeug, and can only be shutdown with a request context
	# So when we want to shutdown flask, we have to send ourself a kill request
	# but we pass a key to make sure it's really us
	@route('/_KILL_SERVER/<killKey>')
	def _killServer(self, killKey):
		if killKey == self.killKey:
			shutdown = request.environ.get('werkzeug.server.shutdown')
			if shutdown is not None:
				shutdown()
			return ''
		else:
			print('hack attempt?')
