#!/usr/bin/python
# -*- coding: utf-8 -*-
'''
MakeICT/Bluebird Arthouse Electronic Door Entry
rpi.py: Hardware control
Authors:
	Dominic Canare <dom@greenlightgo.org>
	Rye Kennedy <ryekennedy@gmail.com>
	Christian Kindel <iceman81292@gmail.com>
'''
from MFRC522 import MFRC522
import time, subprocess
#import wiringpi
import RPi.GPIO as GPIO  
# GPIO.setmode(GPIO.BCM)


class InterfaceControl(object):
	def __init__(self):
		# Pi_rev = ##wiringpi.piBoardRev()	#@TODO: use this?

		self.GPIOS = {
			'internal_buzzer': 11,
			'latch': 37,
			'green_LED':35,
			'yellow_LED':33,
			'red_LED':31,
			'unlock_LED': 15,
			'deny_LED': 13,
			'buzzer': 12, 
			'doorStatus1': 19,
			'doorStatus2': 21,
			'powerSwitch': 29,
		}
		
		#set up I/O pins
		#wiringpi.#wiringpiSetupPhys()
		#wiringpi.pinMode(self.GPIOS['unlock_LED'], 1)
		#wiringpi.pinMode(self.GPIOS['deny_LED'], 1)
		#wiringpi.pinMode(self.GPIOS['latch'], 1)

		#wiringpi.pinMode(self.GPIOS['internal_buzzer'], 1)
		#wiringpi.pinMode(self.GPIOS['doorStatus1'], 0)
		#wiringpi.pinMode(self.GPIOS['doorStatus2'], 0)
		

		# GPIO.setup(9, GPIO.IN)  
		# GPIO.setup(10, GPIO.IN)  
		#GPIO.add_event_detect(9, GPIO.FALLING, callback=self.arm_security, bouncetime=300)
		#Set up Hardware PWM - Only works on GPIO 18 (Phys 12)
		#wiringpi.pwmSetMode(0)				# set PWM to markspace mode
		# #wiringpi.pinMode(self.GPIOS['buzzer'], 2)      # set pin to PWM mode
		#wiringpi.pwmSetClock(750)   			# set HW PWM clock division (frequency)
		#wiringpi.pwmWrite(self.GPIOS['buzzer'], 0)
		
		# proc = subprocess.Popen(['nfc-list'], stderr=subprocess.PIPE)
		# result = proc.stderr.read()
		# self.PN532 = False if 'Timeout' in result else True
		# if not self.PN532:
		# 	self.nfc = NFC.MFRC522()
		self.nfc = MFRC522()
		self.PN532 = False

		GPIO.setup(self.GPIOS['latch'], GPIO.OUT)	
		GPIO.setup(self.GPIOS['red_LED'], GPIO.OUT)	
		GPIO.setup(self.GPIOS['yellow_LED'], GPIO.OUT)	
		GPIO.setup(self.GPIOS['green_LED'], GPIO.OUT)

		GPIO.setup(self.GPIOS['powerSwitch'], GPIO.IN, pull_up_down=GPIO.PUD_UP)

		self.showInactive()
		self.lockMachine()

		# print("breakpoint reached")
		# time.sleep(20000)

#		self.setInterrupts()
				
#	def arm_security():
#                print("big button pressed!")
#		#subprocess.Popen(['/home/pi/code/makeictelectronicdoor/vista/arm-away.sh'])
#		return True

#	def setInterrupts(self):					
#		#wiringpi.#wiringpiISR(self.GPIOS['doorStatus1'], 2,self.arm_security)
	def nfcGetUID(self):
		'''
		Read an NFC card if one is in range and return its UID
		Returns:
		  A string containing the UID of the NFC card
		  None if no card is in range
		'''
		loops = 0
		while loops < 1:
			if self.PN532:
				proc = subprocess.Popen("/home/pi/code/makeictelectronicdoor/nfc-read", stdout=subprocess.PIPE)
				
				(nfcID, err) = proc.communicate()
				nfcID = nfcID.strip()
				if nfcID:
					return nfcID
			else:
				# Scan for cards    
				(status,TagType) = self.nfc.MFRC522_Request(self.nfc.PICC_REQIDL)
				# print("tag type:", TagType)
				# If a card is found
				# print(status)
				# Get the UID of the card
				(status,uid) = self.nfc.MFRC522_Anticoll()
				real_uid = None
				if status == self.nfc.MI_OK:
					# Select the scanned tag
					# self.nfc.MFRC522_SelectTag(uid)
					try:
						# print("trying 7-byte")
						real_uid = self.nfc.MFRC522_GetUID(uid)
					except:
						# print("7-byte failed")
						try:
							# print("trying 4-byte")
							# This is the default key for authentication

							(status,TagType) = self.nfc.MFRC522_Request(self.nfc.PICC_REQIDL)
							(status,uid) = self.nfc.MFRC522_Anticoll()

							real_uid = uid[0:4]
						except:
							# print("4-byte failed")
							real_uid = None
							raise
				# If we have the UID, continue

				# print('uid:', uid)
				# print('real_uid:',real_uid)
				if real_uid:
					if len(real_uid) == 7:
						return format(real_uid[0],'02x') + format(real_uid[1],'02x')+format(real_uid[2], '02x')+format(real_uid[3], '02x')+format(real_uid[4],'02x') + format(real_uid[5],'02x') + format(real_uid[6],'02x')
					elif len(real_uid) == 4:
						return format(real_uid[0],'02x') + format(real_uid[1],'02x')+format(real_uid[2], '02x')+format(real_uid[3], '02x')
					else:
						print("invalid uid length!")
			loops += 1
			time.sleep(0)
		return None

	def setPinMode(self, componentID, mode):
		GPIO.setup(self.GPIOS[componentID], GPIO.OUT)	

	def output(self, componentID, status):
		'''
		Write to a GPIO pin set as an output
		Args:
		  componentID (int): pin number of output pin
		  status (bool): True to turn on, False to turn off
		'''
		# if 'LED' in componentID:
		# 	status = not status
		#wiringpi.digitalWrite(self.GPIOS[componentID], status)
		GPIO.output(self.GPIOS[componentID], status)

	def input(self, componentID):
		'''
		Read a GPIO pin set as an input
		
		Args:
		  componentID (int): pin number of input pin
		Returns:
		  True if pin is high
		  False if pin is low
		'''
		#return wiringpi.digitalRead(self.GPIOS[componentID])
		return GPIO.input(self.GPIOS[componentID])

	def getState(self):
		return self.state

	def showActive(self):
		self.state = 'active'
		self.output('green_LED', True)	
		self.output('yellow_LED', False)	
		self.output('red_LED', False)

	def showBusy(self):
		self.state = 'busy'
		self.output('green_LED', False)
		self.output('yellow_LED', True)	
		self.output('red_LED', False)	

	def showInactive(self):
		self.state = 'inactive'
		self.output('green_LED', False)
		self.output('yellow_LED', False)	
		self.output('red_LED', True)

	def setPowerStatus(self, powerIsOn):
		'''
		Set power LED state
		Args:
		  powerIsOn (bool): True to turn on LED, False to turn off
		'''
		self.output('red_LED', powerIsOn)
		# if powerIsOn:
		# 	self.output('unlock_LED', False)
		# 	self.output('latch', False)
		pass

	def setBuzzerOn(self, buzzerOn):
		'''
		Set buzzer state
		Args:
		  buzzerOn (bool): True to turn on buzzer, False to turn off
		'''
		if buzzerOn:
			pass
			#wiringpi.pwmWrite(self.GPIOS['buzzer'], 100)
		else:
			pass
			#wiringpi.pwmWrite(self.GPIOS['buzzer'], 0)

	def unlockMachine(self, timeout=5):
		'''
		Unlock door, activate unlock_LED and buzzer, and relock door after timeout
		Args:
		  timeout (int): length of time to keep the door unlocked (default 2)
		'''
		self.output('latch', True)
		self.showActive()
		# self.output('internal_buzzer', True)
		# self.setBuzzerOn(True)
		# time.sleep(timeout)
		# self.output('latch', False)
		# self.showInactive()
		# self.output('internal_buzzer', False)
		# self.output('unlock_LED', False)
		# self.setBuzzerOn(False)

	def lockMachine(self):
		# print("locking machine")
		self.output('latch', False)
		self.showInactive()

	def checkPowerSwitch(self):
		return not self.input('powerSwitch')

	def checkDoors(self):
		'''
		Check the open/closed status of both doors. 
		Returns:
		  A list of Boolean values representing each door state: True if open, False if closed
		'''

		#invert values if using pull-down resistors on switch inputs
		return [self.input('doorStatus1'), self.input('doorStatus2')]


	def showBadCardRead(self, blinkCount=3, blinkPeriod=0.25):
		'''
		Blink unlock_LED to indicate invalid card read
		Args:
		  blinkCount (int): number of time to blink (default 3)
		  blinkPeriod (float): on/off duration in seconds (default 0.25)
		'''
		for i in range(blinkCount):
			self.output('red_LED', True)
			# self.setBuzzerOn(True)
			time.sleep(blinkPeriod)
			self.output('red_LED', False)
			# self.setBuzzerOn(False)
			time.sleep(blinkPeriod)

		self.showInactive()

	def cleanup(self):
		'''
		Reset status of GPIO pins before terminating
		'''
		GPIO.cleanup()
		# for pin in self.GPIOS:

		# 	pass
		# 	#wiringpi.pinMode(self.GPIOS[pin], 0)

interfaceControl = InterfaceControl()
