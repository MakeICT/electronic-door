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

def doUnlock(reason):
	needToRestart = False
	try:
		import enroll
		from backend import backend

		import time

		backend.log('message', message='Unlock door: %s' % args.reason)
		if enroll.killDoorLock() != 1:
			needToRestart = True

		import rpi
		rpi.interfaceControl.unlockDoor()
	except KeyboardInterrupt:
		pass
	finally:
		if needToRestart:
			print("Locking door back")
			enroll.startDoorLock()
		


if __name__ == "__main__":
	import argparse
	
	parser = argparse.ArgumentParser(description='Manually control the door latch')
	parser.add_argument('reason', metavar='reason', nargs='+', help="Reason why this is happening")
	args = parser.parse_args()
	args.reason = ' '.join(args.reason)

	doUnlock(args.reason)
