# -- coding: utf-8 --

from PyQt5 import QtCore
import logging

class TrackedThread(QtCore.QThread):
	threads = []
	def __init__(self, *args, **kwargs):
		super().__init__(*args, **kwargs)
		TrackedThread.threads.append(self)
	
	@staticmethod
	def waitForAll():
		timedOut = False
		if len(TrackedThread.threads) > 0:
			logging.debug('Waiting for %d threads to finish' % len(TrackedThread.threads))
			for t in TrackedThread.threads:
				timedOut = t.wait(1000) or timedOut

		return not timedOut


class SimpleThread(TrackedThread):
	def __init__(self, callback):
		super().__init__()
		self.callback = callback

	def run(self):
		self.callback()
		
class Timer(QtCore.QTimer):
	def __init__(self, interval, callback, parent=None):
		super().__init__(parent)

		self.setInterval(interval)
		self.timeout.connect(callback)
		self.startTime = None

	def start(self):
		self.startTime = time.time() * 1000
		super().start()

	def remainingTime(self):
		elapsed = (time.time()*1000) - self.startTime
		return self.interval() - elapsed

class SingleTimer(Timer):
	def __init__(self, interval, callback, parent=None):
		super().__init__(interval, callback, parent)
		self.setSingleShot(True)
