#!/usr/bin/python
# -*- coding: utf-8 -*-
'''
MakeICT/Bluebird Arthouse Electronic Door Entry

cli.py: Launches interactive cli for database and entry door management

Authors:
	Dominic Canare <dom@greenlightgo.org>
	Rye Kennedy <ryekennedy@gmail.com>
	Christian Kindel <iceman81292@gmail.com>
'''

from database_cli import DatabaseCLI
import sys

if '-c' in sys.argv:
	sys.exit("Denied!")

cli = DatabaseCLI()

cli.cmdloop()
