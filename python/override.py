#!/usr/bin/python
# -*- coding: utf-8 -*-
'''
MakeICT/Bluebird Arthouse Electronic Door Entry

override.py: Gives manual control of door

Authors:
	Dominic Canare <dom@greenlightgo.org>
	Rye Kennedy <ryekennedy@gmail.com>
	Christian Kindel <iceman81292@gmail.com>
'''

if __name__ == "__main__":
	import argparse
	
	parser = argparse.ArgumentParser(description='Manually control the door latch')
	parser.add_argument("-l", "--lock", help="Lock the door", action="store_true")
	args = parser.parse_args()
	try:
		from enroll import killDoorLock, startDoorLock
		import rpi
		if not args.lock:
			killDoorLock()
			rpi.interfaceControl.unlockDoor()
	except KeyboardInterrupt:
		pass
	finally:
		startDoorLock()
		

