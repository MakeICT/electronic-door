#!/usr/bin/env python
# -- coding: utf-8 --

import sys, signal
from PySide import QtCore

import plugins, events, utils

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



def sigint_handler(signum, stack):
	#print('signal handler')
	sys.exit(1)
	#QtCore.QCoreApplication.quit()

if __name__ == '__main__':
	app = MCP(sys.argv)
	signal.signal(signal.SIGINT, sigint_handler)

	app.start()
