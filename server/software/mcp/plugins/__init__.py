# -- coding: utf-8 --

import os, logging
import re
from importlib.machinery import SourceFileLoader

from PyQt5 import QtCore

import plugins, utils, events, backend

import json

loadedPlugins = []

def getPluginByName(name):
	for plugin in loadedPlugins:
		if plugin.getName() == name:
			return plugin

class Plugin(QtCore.QObject):
	systemEvent = QtCore.pyqtSignal(object)

	def __init__(self):
		super().__init__()
		self.db = backend.Backend(self.getName())
		self.enabled = False
		self.options = []
		self.actions = []
		self.defineOptions()
		self.defineActions()

		self.logger = logging.getLogger(self.getName())

		self.pluginID = self.db.getPluginIDByName(self.getName())
		if self.pluginID is None:
			if isinstance(self, ClientPlugin):
				clientOptions = self.clientOptions
			else:
				clientOptions = None

			self.pluginID = self.db.addPlugin(self.getName(), self.options, clientOptions)
			
	def getName(self):
		# strip top-level module name
		name = re.sub('^[^\\.]*\\.', '', type(self).__module__)
		return name

	def getOptionObject(self, name):
		for option in self.options:
			if option.name == name:
				return option

	def getOption(self, name):
		val = self.db.getPluginOption(self.getName(), name)
		if val is None:
			optionObj = self.getOptionObject(name)
			if optionObj is not None:
				return optionObj.defaultValue
		else:
			return val

	def setOption(self, name, value):
		optionObj = self.getOptionObject(name)
		if optionObj is None:
			raise Exception('Unknown option: %s' % name)

		if optionObj.allowedValues is not None:
			if value not in optionObj.allowedValues:
				raise Exception('Invalid value for option %s = %s' % (name, value))
		elif optionObj.minimum is not None and value < optionObj.minimum:
			raise Exception('Invalid value for option %s = %s' % (name, value))
		elif optionObj.maximum is not None and value > optionObj.maximum:
			return optionObj.defaultValue

		self.db.setPluginOption(self.getName(), name, value)

	def defineOptions(self):
		pass

	def defineActions(self):
		pass

	def doAction(self, actionName, parameters):
		for action in self.actions:
			if action.name == actionName:
				action.callback(parameters)

	def handleSystemEvent(self, event):
		pass

	def isEnabled(self):
		return self.enabled

	def setEnabled(self, status):
		self.enabled = status

	def __str__(self):
		return '<%s>' % self.getName()

class ClientPlugin(Plugin):
	def __init__(self):
		self.clientOptions = []
		self.clientActions = []

		super().__init__()

	def getOption(self, optionName, clientID=None):
		if clientID == None:
			return super().getOption(optionName)
		else:
			return self.db.getPluginOption(self.getName(), optionName, clientID)

	def setOption(self, optionName, value, clientID=None):
		if clientID == None:
			return super().setOption(optionName, value)
		else:
			return self.db.setPluginOption(self.getName(), optionName, value, clientID)

	def getClientOptions(self, clientID):
		options = self.clientOptions.copy()
		for o in options:
			o.value = self.getOption(o.name, clientID)

		return options

	def doAction(self, actionName, parameters, client=None):
		if client is None:
			return super().doAction(actionName, parameters)
		else:
			for action in self.clientActions:
				if action.name == actionName:
					action.callback(parameters, client)

class ThreadedPlugin(Plugin):
	def __init__(self):
		super().__init__()
		self.thread = utils.SimpleThread(self.run)

	def handleSystemEvent(self, event):
		if isinstance(event, events.Ready):
			if event.originator == QtCore.QCoreApplication.instance():
				self.thread.start()


def loadAllFromPath(base='plugins'):
	global loadedPlugins

	# Load system plugins
	loadedPlugins.append(logger.Plugin())

	# make a list of directories to check
	pluginDirs = []
	for p in os.listdir(base):
		if p[:2] != '__' and os.path.isdir(os.path.join(base, p)):
			pluginDirs.append(p)

	# Try to load plugins
	# Some plugins depend on others, so we may have to try multiple times
	leftover = len(pluginDirs) + 1 # add 1 to make sure it's ran at least once
	while len(pluginDirs) > 0 and len(pluginDirs) != leftover:
		leftover = len(pluginDirs)
		modules = {}
		for p in list(pluginDirs):
			logging.debug('Loading plugin module: %s...' % p)
			path = os.path.join(base, p)

			# load the module
			try:
				mod = SourceFileLoader('plugins.%s' % p, os.path.join(path, "__init__.py")).load_module()
				modules[p] = mod

				# add to the module list
				plugins.__dict__[p] = mod
				pluginDirs.remove(p)
			except Exception as exc:
				logging.error('Failed to load plugin module %s (%s)' % (path, exc))
		
		for name, mod in modules.items():
			logging.debug('Initializing plugin: %s...' % name)

			# load the plugin
			try:
				plugin = mod.Plugin()
				loadedPlugins.append(plugin)
				logging.debug('Initialized %s' % plugin.getName())
				logging.debug('Initialized %s' % plugin.getName())
			except Exception as exc:
				logging.error('Failed to create plugin %s (%s)' % (name, exc))

	if len(pluginDirs) > 0:
		logging.error('Failed to load plugin modules: %s' % pluginDirs)
	
	return loadedPlugins

# late import (logger requires Plugin class be defined)
from . import logger
