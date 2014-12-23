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
	parser.add_argument('reason', metavar='reason', nargs='*', help="Reason why this is happening")
	parser.add_argument("-l", "--lock", help="Lock the door", action="store_true")
	args = parser.parse_args()
	args.reason = ' '.join(args.reason)

	try:
		from enroll import killDoorLock, startDoorLock
		from backend import backend
		import rpi
		if not args.lock:
			backend.log('message', message='Unlock door: %s' % args.reason)
			killDoorLock()
			rpi.interfaceControl.unlockDoor()
	except KeyboardInterrupt:
		pass
	finally:
		startDoorLock()
		

