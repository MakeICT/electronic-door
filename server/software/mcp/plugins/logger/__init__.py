# -- coding: utf-8 --

import sys
import logging
import backend
import events

import plugins

class DBLogger(logging.Handler):
	def __init__(self, db):
		super().__init__()
		self.db = db

	def emit(self, record):
		formattedMessage = self.formatter.format(record)

		print('[%s] %s' % (record.levelname, formattedMessage))
		self.db.log(record.levelname, formattedMessage)

class Plugin(plugins.Plugin):
	def __init__(self):
		super().__init__()

		self.logHandler = DBLogger(self.db)
		self.logHandler.addFilter(self)
		self.logHandler.setFormatter(logging.Formatter(self.getOption('format')))

		logging.getLogger().setLevel(self.getOption('level'))
		logging.getLogger().addHandler(self.logHandler)

		self.systemEvent.emit(events.Ready(self))

	def defineOptions(self):
		super().defineOptions()

		self.options += [
			backend.Option('format', 'text', '[%(name)s] %(message)s'),
			backend.Option('level', 'text', 'INFO', ['INFO', 'DEBUG']),
		]

	def setOption(self, name, value):
		if name == 'format':
			if '%(message)s' not in value:
				raise Exception('Invalid log format')
			else:
				super().setOption(name, value)
				self.logHandler.setFormatter(logging.Formatter(self.getOption('format')))
		elif name == 'level':
			super().setOption(name, value)
			logging.getLogger().setLevel(self.getOption('level'))
		else:
			super().setOption(name, value)

	def handleSystemEvent(self, event):
		super().handleSystemEvent(event)

		if isinstance(event, events.Error):
			logging.error(event)
		else:
			logging.debug('EVENT: %s' % event)

	def filter(self, record):
		if record.name.startswith('requests.'):
			return False
		if record.name == 'engineio':
			return False

		return True
