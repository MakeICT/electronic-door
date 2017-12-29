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
	def __init__(self, originator, message, errorObject=None):
		self.originator = originator
		self.message = message
		self.errorObject = errorObject

	def _substr__(self):
		return '%s "%s" (%s)' % (super()._substr__(), self.message, self.errorObject)

class Exit(MCPEvent):
	pass

class AuthorizationRequest(MCPEvent):
	def __init__(self, originator, nfcID):
		super().__init__(originator)
		self.nfcID = nfcID

class AuthorizationGrant(MCPEvent):
	def __init__(self, originator, target):
		super().__init__(originator)
		self.target = target

class AuthorizationDenial(MCPEvent):
	def __init__(self, originator, target):
		super().__init__(originator)
		self.target = target
		