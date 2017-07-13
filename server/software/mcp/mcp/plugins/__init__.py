# -- coding: utf-8 --

import os, logging
from importlib.machinery import SourceFileLoader

from PySide import QtCore

import plugins

loadedPlugins = []

class AbstractPlugin(QtCore.QObject):
	systemEvent = QtCore.Signal(object)

	def __init__(self):
		super().__init__()

	def getName(self):
		return type(self).__module__
		raise NotImplementedError()

	def handleEvent(self, event):
		pass

	def getOption(self, name):
		raise NotImplementedError()

	def setOption(self, name, value):
		raise NotImplementedError()

	def handleSystemEvent(self, event):
		pass

	def __str__(self):
		return '<%s>' % self.getName()

def loadAllFromPath(base='plugins'):
	global loadedPlugins

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
			mod = SourceFileLoader("plugins.%s" % p, os.path.join(path, "__init__.py")).load_module()
			modules[p] = mod

			# add to the module list
			plugins.__dict__[p] = mod
			pluginDirs.remove(p)
		
		for name, mod in modules.items():
			logging.debug('Initializing plugin: %s...' % name)

			# load the plugin
			plugin = mod.Plugin()
			loadedPlugins.append(plugin)
			logging.debug('Loaded %s' % plugin.getName())
			print('Loaded %s' % plugin.getName())

	if len(pluginDirs) > 0:
		logging.error('Failed to load plugin modules: %s' % pluginDirs)
	
	return loadedPlugins
