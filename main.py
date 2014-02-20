#!/usr/bin/python
# -*- coding: utf-8 -*-
'''
MakeICT/Bluebird Arthouse Electronic Door Entry
Authors:
	Dominic Canare <dom@greenlightgo.org>
	Rye Kennedy <ryekennedy@gmail.com>
'''


import subprocess, time

import MySQLdb, MySQLdb.cursors
import RPi.GPIO as GPIO

GPIO.setwarnings(False)
GPIO.setmode(GPIO.BCM)
GPIO.setup(25, GPIO.OUT)

query = '''
	SELECT * FROM persons
		JOIN rfids ON persons.personID = rfids.personID
	WHERE rfids.id = %s'''

db = MySQLdb.connect(
	host="localhost" ,db="MakeICTMemberKeys",
	user="MakeICTDBUser", passwd="2879fd3b0793d7972cbf7647bc1e62a4",
	cursorclass=MySQLdb.cursors.DictCursor
)
cursor = db.cursor()

while True:
	proc = subprocess.Popen("./nfc-read", stdout=subprocess.PIPE, shell=True)
	(line, err) = proc.communicate()
	line = line.strip()

	if line != "":
		cursor.execute(query, line)
	
		print "ID:", line, "=",
		row = cursor.fetchone()
		if row != None:
			print "GRANTED TO '%s' '%s' '%s'" % (row['firstName'], row['lastName'], row['email'])
			# @TODO: pull pin HIGH to un-latch door
			# @TODO: set LED states
			GPIO.output(25, True);
			time.sleep(2)
			GPIO.output(25, False);
		else:
			print "DENIED"
			# @TODO: set LED states
			GPIO.output(25, True);
			time.sleep(.25)
			GPIO.output(25, False);
			time.sleep(.25)
			GPIO.output(25, True);
			time.sleep(.25)
			GPIO.output(25, False);

	time.sleep(1)

GPIO.cleanup()

