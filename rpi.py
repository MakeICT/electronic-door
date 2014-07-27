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
import wiringpi2
import time

class InterfaceControl(object):
	def __init__(self):
		self.GPIOS = {
			'latch': 11,
			'unlock_LED': 22,
			'power_LED': 15,  #revert to 27 before pull request
			'buzzer': 18,	  #revert to 10 before pull request
			'doorStatus1': 4,
			'doorStatus2': 17,
		}
		
		GPIO.setwarnings(False)
		GPIO.setmode(GPIO.BCM)
		GPIO.setup(self.GPIOS['latch'], GPIO.OUT)
		GPIO.setup(self.GPIOS['unlock_LED'], GPIO.OUT)
		GPIO.setup(self.GPIOS['power_LED'], GPIO.OUT)
		
		#Set up Hardware PWM - Only works on GPIO 18
		wiringpi2.wiringPiSetupGpio()  
	#	wiringpi2.pwmSetMode(0)				# set PWM to markspace mode
		wiringpi2.pinMode(self.GPIOS['buzzer'], 2)      # set pin to PWM mode
		wiringpi2.pwmSetClock(750)   			# set HW PWM clock division (frequency)
		wiringpi2.pwmWrite(self.GPIOS['buzzer'], 0)    

		GPIO.setup(self.GPIOS['doorStatus1'], GPIO.IN, pull_up_down=GPIO.PUD_UP)
		GPIO.setup(self.GPIOS['doorStatus2'], GPIO.IN, pull_up_down=GPIO.PUD_UP)
		
		#For testing: remove before pull request
		GPIO.setup(27, GPIO.OUT)
		GPIO.output(27,False)
		GPIO.setup(23, GPIO.OUT)
		GPIO.output(23,False)
                #end test code

		GPIO.setwarnings(True)

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
	
	def setPowerStatus(self, powerIsOn):
		'''
		Set power LED state

		Args:
		powerIsOn -- True to turn on LED, False to turn off
		'''
		self.output('power_LED', powerIsOn)

	def setBuzzerOn(self, buzzerOn):
		'''
		Set buzzer state

		Args:
		buzzerOn -- True to turn on buzzer, False to turn off
		'''

		if buzzerOn:
			wiringpi2.pwmWrite(self.GPIOS['buzzer'], 30)    # 30% duty cycle
		else:
			wiringpi2.pwmWrite(self.GPIOS['buzzer'], 0)


	def unlockDoor(self, timeout=2):
		'''
		Unlock door, activate unlock_LED and buzzer, and relock door after timeout

		Args:
		timeout -- length of time to keep the door unlocked (default 2)
		'''
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

	def showBadCardRead(self, blinkCount=3, blinkPeriod=0.25):
		'''
		Blink power_LED to indicate invalid card read

		Args:
		blinkCount -- number of time to blink (default 3)
		blinkPeriod -- on/off duration in seconds (default 0.25)
		'''
		for i in range(blinkCount):
			self.output('power_LED', True)
			time.sleep(blinkPeriod)
			self.output('power_LED', False)
			time.sleep(blinkPeriod)

	def cleanup(self):
		'''
		Reset status of GPIO pins before terminating
		'''
		wiringpi2.pwmWrite(self.GPIOS['buzzer'], 0)	#make sure PWM is off
		GPIO.cleanup()

interfaceControl = InterfaceControl()
