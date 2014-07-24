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
		self.GPIOS = {
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

		GPIO.setup(self.GPIOS['doorStatus1'], GPIO.IN, pull_up_down=GPIO.PUD_UP)
		GPIO.setup(self.GPIOS['doorStatus2'], GPIO.IN, pull_up_down=GPIO.PUD_UP)
		
		GPIO.setwarnings(True)

		#For testing: remove before pull request
		GPIO.setup(18, GPIO.OUT)
		GPIO.output(18,False)
		GPIO.setup(23, GPIO.OUT)
		GPIO.output(23,False)
		#end test code



	'''
	@TODO: Document this metho
	'''
	def output(self, componentID, status):
		GPIO.output(self.GPIOS[componentID], status)

	def input(self, componentID):
		'''
		Read a GPIO pin set as an input

		Returns:
		True if pin is high
		False if pin is low
		'''
		return GPIO.input(self.GPIOS[componentID])
		
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

	def checkDoors(self):
		'''
		Check the open/closed status of both doors. 

		Returns:
		0 if both closed
		1 if door 1 is open
		2 if door 2 is open
		3 if both are open
		'''

#		Use this line for pull-up resistors
		return self.input('doorStatus1') | self.input('doorStatus2')<<1
#		Use this line for pull-down resistors
#		return self.input('doorStatus1')^1 | (self.input('doorStaus2')^1)<<1



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
