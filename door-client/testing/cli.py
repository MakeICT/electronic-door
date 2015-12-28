#!/usr/bin/python
# -*- coding: utf-8 -*-
'''
MakeICT/Bluebird Arthouse Electronic Door Entry

cli.py: Launches interactive cli for debugging and testing door hardware

Authors:
	Dominic Canare <dom@greenlightgo.org>
	Rye Kennedy <ryekennedy@gmail.com>
	Christian Kindel <iceman81292@gmail.com>
'''

from debug_cli import DebugCLI
import sys

if '-c' in sys.argv:
	sys.exit("Denied!")

cli = DebugCLI()

cli.cmdloop()
