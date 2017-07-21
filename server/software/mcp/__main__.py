#!/usr/bin/env python
# -- coding: utf-8 --

import sys, signal
from PySide import QtCore

import plugins, events, utils, backend

class MCP(QtCore.QCoreApplication):
	systemEvent = QtCore.Signal(object)

	def __init__(self, *args, **kwargs):
		super().__init__(*args, **kwargs)

		plugins.loadAllFromPath()
		for plugin in plugins.loadedPlugins:
			plugin.systemEvent.connect(self.systemEvent.emit)
			self.systemEvent.connect(plugin.handleSystemEvent)
			
		self.systemEvent.connect(self.handleEvent)
		self.systemEvent.emit(events.Ready(self))

	def start(self):
		return super().exec_()

	def handleEvent(self, event):
		if isinstance(event, events.Exit):
			print('Exit requested by %s' % event.originator)
			utils.TrackedThread.waitForAll()
			self.quit()

	def __str__(self):
		return '<MCP>'

class Setting():
	def __init__(self, name, dataType, defaultValue, allowedValues=None, minimum=None, maximum=None):
		self.name = name
		self.type = dataType
		self.defaultValue = defaultValue
		self.allowedValues = allowedValues
		self.minimum = minimum
		self.maximum = maximum

if __name__ == '__main__':
	if len(sys.argv) < 2:
		print('Please specify a credentials file.')
		exit(1)

	try:
		with open(sys.argv[1], 'r') as dbCredsFile:
			dbCreds = dbCredsFile.readline().split('\t')

		backend.setCredentials(username=dbCreds[0].strip(), password=dbCreds[1].strip())
	except Exception as exc:
		print('An error occurred while reading the DB credentials file.')
		print(exc)
		exit(2)

	app = MCP(sys.argv)
	app.start()
