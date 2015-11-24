#!/usr/bin/python

import time
import serial
import binascii
import struct
import sys
#import RPi.GPIO as GPIO

#GPIO.setmode(GPIO.BCM)

rw_pin = 26
#GPIO.setup(rw_pin, GPIO.OUT)
#GPIO.output(rw_pin, GPIO.HIGH)

flag = 0x7E
client_address = 0x01
#ser = serial.Serial('/dev/ttyAMA0', 9600)
ser = serial.Serial('/dev/ttyUSB0', 9600)

state = "waiting"
packet = []

def check_CRC(packet):
    return True

def process_packet(packet):
    length = packet[0]
    from_address = packet[1]
    to_address = packet[2]
    function = packet[3]
    crc = packet[-2:]
    payload = packet[4:-2]

    print "========================"
    print packet
    print "length:", length
    print "from:", hex(from_address)
    print "to:", hex(to_address)
    print "------------------------"
    print "function:", function
    print "data:", payload
    print "------------------------"
    print "CRC:", hex(crc[0]), hex(crc[1])
    if not length == len(packet):
        print "ERROR: Packet length incorrect"
    if not check_CRC(packet):
        print "ERROR: CRC incorrect"

def send_packet(from_addr=0x00, to_addr=client_address, function = 0x00, payload=[0x00]):
#    GPIO.output(rw_pin, GPIO.HIGH)
    length = 6 + len(payload)
    data = ''
    for byte in payload:
        data = data + chr(byte)
    packet = chr(flag) + chr(length) + chr(from_addr) + chr(to_addr) + chr(function) + data + chr(0xFF) + chr(0xFF)  + chr(flag)
    ser.write(packet)


def receive_packet():
    global packet
#    GPIO.output(rw_pin, GPIO.LOW)
    byte = int(binascii.b2a_hex(ser.read()), 16)
    if byte == 0x7E:
        if packet:
            process_packet(packet)
            packet = []
    else:
        packet.append(byte)


while 0:
    receive_packet()
while 1:
    user_input = input()
    if user_input >= 0 and user_input <= 2:
        send_packet(function = user_input)
    elif user_input == 3:
        send_packet(function=0x05,
        payload=[38,40,38,40,38,40,38,40,43,  21,7,7,7,21,7,7,7,42])
send_packet(0x01, 0x02, 0x02, [0x05, 0x06, 0x07, 0x08, 0x09, 0x0A])
arg_list = sys.argv
send_packet(function=int(arg_list[1]))


GPIO.cleanup()
