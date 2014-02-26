#!/usr/bin/python
# -*- coding: utf-8 -*-
'''
MakeICT/Bluebird Arthouse Electronic Door Entry

rpi.py: Hardware control

Authors:
	Dominic Canare <dom@greenlightgo.org>
	Rye Kennedy <ryekennedy@gmail.com>
'''

import RPi.GPIO as GPIO
import time

class InterfaceControl(object):
	def __init__(self):
		self.GPIO = {
			'latch': 11,
			'unlock_LED': 22,
			'power_LED': 27,
			'buzzer': 10,
			'doorStatus1': 4,
			'doorStatus2': 17,
		}
		
		GPIO.setwarnings(False)
		GPIO.setmode(GPIO.BCM)
		GPIO.setup(self.GPIOS['latch'], GPIO.OUT)
		GPIO.setup(self.GPIOS['unlock_LED'], GPIO.OUT)
		GPIO.setup(self.GPIOS['power_LED'], GPIO.OUT)
		GPIO.setup(self.GPIOS['buzzer'], GPIO.OUT)
		
		GPIO.setup(self.GPIOS['doorStatus1'], GPIO.IN)
		GPIO.setup(self.GPIOS['doorStatus2'], GPIO.IN)
		
		GPIO.setwarnings(True)

	'''
	@TODO: Document this method
	'''
	def output(componentID, status):
		GPIO.output(self.GPIOS[componentID], status)

	'''
	@TODO: Document this method
	'''
	def setPowerStatus(self, powerIsOn):
		self.output('power_LED', powerIsOn)

	'''
	@TODO: Document this method
	'''
	def setBuzzerOn(self, buzzerOn):
		if buzzerOn:
			# @TODO: PWM the buzzer
			pass
		else:
			# @TODO: Turn off the buzzer
			pass

	'''
	@TODO: Document this method
	'''
	def unlockDoor(self, timeout=2):
		self.output('latch', True)
		self.output('unlock_LED', True)
		self.setBuzzerOn(True)
		time.sleep(timeout)
		self.output('latch', False)
		self.output('unlock_LED', False)
		self.setBuzzerOn(False)

	'''
	@TODO: Document this method
	'''
	def showBadCardRead(self, blinkCount=3, blinkPeriod=0.25):
		for i in range(blinkCount):
			self.output('power_LED', True)
			time.sleep(blinkPeriod)
			self.output('power_LED', False)
			time.sleep(blinkPeriod)

	'''
	@TODO: Document this method
	'''
	def cleanup(self):
		GPIO.cleanup()

interfaceControl = InterfaceControl()
