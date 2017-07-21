# -- coding: utf-8 --

class MCPEvent():
	def __init__(self, originator):
		self.originator = originator

	def _substr__(self):
		return 'from %s' % self.originator

	def __str__(self):
		return '<%s %s>' % (self.__class__.__name__, self._substr__())

class Ready(MCPEvent):
	pass

class Error(MCPEvent):
	def __init__(self, originator, message):
		self.originator = originator
		self.message = message

	def _substr__(self):
		return '%s "%s"' % (super()._substr__(), self.message)

class Exit(MCPEvent):
	pass