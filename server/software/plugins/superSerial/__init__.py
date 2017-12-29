# -- coding: utf-8 --

import serial
import time

from PySide import QtCore

import utils, events, plugins, backend


_SERIAL_FLAGS = {
	'ESCAPE':	0xFE,
	'START':	0xFA,
	'END':		0xFB,
}
_SERIAL_COMMANDS = {
	'ADDRESS':	0x00,
	'UNLOCK':	0x01,
	'LOCK':	 	0x02,
	'KEY':		0x03,
	'TEXT':		0x04,
	'TONE':		0x05,
	'ARM':		0x06,
	'DOOR':		0x07,
	'LIGHTS':	0x08,
	'DOORBELL': 0x09,
	'DENY':		0x0C,
	'DOORBELL_PRESSED': 0x0D,
	         
	'ACK':		0xAA,
	'ERROR':	0xFA,
}

class Plugin(plugins.ThreadedPlugin):
	def __init__(self):
		super().__init__()

		self.serial = None

		self.inputBuffer = []
		self.outputBuffer = []

		self.transactionID = 0

	def defineOptions(self):
		self.options += [
			backend.Option(name='port', dataType='text', defaultValue=''),
			backend.Option(name='baud', dataType='number', defaultValue=115200, allowedValues=[9600, 19200, 38400, 57600, 115200]),
		]

	def _parseSerialData(data):
		escapeNextByte = False
		unescapedPacket = []
		for b in data:
			if b == _SERIAL_FLAGS['ESCAPE'] and not escapeNextByte:
				escapeNextByte = True
			else:
				unescapedPacket.append(b)
				escapeNextByte = False

		transactionID = unescapedPacket[1]
		sender = unescapedPacket[2]
		recipient = unescapedPacket[3]
		command = unescapedPacket[4]
		payload = unescapedPacket[6:6+unescapedPacket[5]]

		if recipient != 0:
			return None
		else:
			return Packet(transactionID, sender, recipient, command, payload)


	def run(self):
		self.keepRunning = True

		port = self.getOption('port')
		baud = self.getOption('baud')

		if port is None or baud is None:
			self.systemEvent.emit(events.Error(self, 'Serial plugin not configured'))
			return
			
		try:
			self.serial = serial.Serial(port, baud, timeout=0)
		except Exception as exc:
			self.systemEvent.emit(events.Error(self, 'Serial plugin failed to initialize', exc))
			return

		self.systemEvent.emit(events.Ready(self))

		while self.keepRunning:
			b = self.serial.read()
			if len(b) > 0:
				if len(inputBuffer) == 0 and b != _SERIAL_FLAGS['START']:
					# garbage
					continue
	
				if b == _SERIAL_FLAGS['START'] and not self.escapeNextByte:
					self.inputBuffer = []

				self.inputBuffer.append(b)
		
				wasEscaped = self.escapeNextByte
				if b == _SERIAL_FLAGS['ESCAPE'] and not self.escapeNextByte:
					self.escapeNextByte = True
				else:
					self.escapeNextByte = False

				if b == SERIAL_FLAGS['END'] and not wasEscaped:
					packet = self._parseSerialData(self.inputBuffer)
					if packet is not None:
						self.outputBuffer.append(Packet(0, event.originator, _SERIAL_COMMANDS['ACK'], packet.transactionID))

						if packet.command == _SERIAL_COMMANDS['KEY']:
							event = events.AuthorizationRequest(sender, payload)
							self.systemEvent.emit(event)

			elif self.outputBuffer.length > 0:
				pass
			else:
				time.sleep(0)

	def handleSystemEvent(self, event):
		super().handleSystemEvent(event)
		
		if isinstance(event, events.Exit):
			self.keepRunning = False
		elif isinstance(event, events.AuthorizationGrant):
			pass
			#@TODO: add an auth grant to the buffer
			#self.buffer.append()
		elif isinstance(event, events.AuthorizationDenial):
			pass
			#@TODO: add an auth denial to the buffer
			#self.buffer.append()

class Packet():
	def __init__(self, transactionID, sender, recipient, command, payload=[]):
		self.transactionID = transactionID
		self.sender = sender
		self.recipient = recipient
		self.command = command
		self.payload = payload

	def toBytes(self):
		byteArray = []
		
		def append(b):
			if b in _SERIAL_FLAGS.values():
				byteArray.append(_SERIAL_FLAGS['ESCAPE'])

			byteArray.append(b)

		append(self.transactionID)
		append(self.sender)
		append(self.recipient)
		append(self.command)

		for b in payload:
			append(b)
		
		crc = 0
		append(crc)

		return [_SERIAL_COMMANDS['START']] + byteArray + [_SERIAL_COMMANDS['STOP']]

