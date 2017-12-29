# -- coding: utf-8 --

import sys
import select
import time

from PySide import QtCore

import utils, events, plugins, backend

class Plugin(plugins.ClientPlugin):
	def __init__(self):
		super().__init__()
		self.db = backend.Backend()
		self.systemEvent.emit(events.Ready(self))

	def defineOptions(self):
		super().defineOptions()

		self.clientOptions += [
			backend.Option(name='unlockDuration', dataType='number', defaultValue=3),
			backend.Option(name='authorizationTag', dataType='text', defaultValue=''),
		]

	def defineActions(self):
		super().defineActions()

		self.actions += [
			backend.Action(
				'unlockAll',
				self.sendUnlock,
				backend.Option('duration', 'number', 3)
			)
		]

		self.clientActions += [
			backend.Action(
				'unlockNow',
				self.sendUnlock,
				backend.Option('duration', 'number', 3)
			)
		]
	
	def sendUnlock(self, parameters, client=None):
		print(parameters)
		self.systemEvent.emit(events.AuthorizationGrant(None, client))

	def handleSystemEvent(self, event):
		super().handleSystemEvent(event)
		
		if isinstance(event, events.AuthorizationRequest):
			if self.db.checkNFCAuthAtClient(event.nfcID, event.originator):
				resultEvent = events.AuthorizationGrant(None, event.originator)
			else:
				resultEvent = events.AuthorizationDenial(None, event.originator)
			
			self.systemEvent.emit(resultEvent)
