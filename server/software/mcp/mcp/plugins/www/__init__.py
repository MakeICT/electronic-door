# -- coding: utf-8 --

import plugins, utils, events

class Plugin(plugins.AbstractPlugin):
	def __init__(self):
		super().__init__()
		self.systemEvent.emit(events.Ready(self))

	def handleSystemEvent(self, event):
		pass
