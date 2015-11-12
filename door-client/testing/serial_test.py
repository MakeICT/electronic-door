#!/usr/bin/python

import time
import serial
import binascii
import struct
import sys

flag = 0x7E

state = "waiting"
packet = []

def process_packet(packet):
    length = packet[0]
    from_address = packet[1]
    to_address = packet[2]
    function = packet[3]
    crc = packet[-1]
    payload = packet[4:-1]

    print "========================"
    print packet
    print "length:", length
    print "from:", hex(from_address)
    print "to:", hex(to_address)
    print "payload:", payload
    print "------------------------"
    print "function:", function
    print "data:", payload
    print "------------------------"
    print "CRC:", hex(crc)

def send_packet(from_addr=0x01, to_addr=0x00, function = 0x00, payload=[]):
#    packet = struct.pack('cccccccccc', chr(0x7E), chr(length),chr(from_addr), chr(to_addr), chr(function),chr(payload),chr(0x09), chr(0x07), chr(0xFF),chr(0x7E))
    length = 4 + len(payload)
    data = ''
    for byte in payload:
        data = data + chr(byte)
    packet = chr(flag) + chr(length) + chr(from_addr) + chr(to_addr) + chr(function) + data + chr(length) + chr(flag)
    ser.write(packet) 

ser = serial.Serial('/dev/ttyAMA0', 9600)

#send_packet(0x01, 0x02, 0x02, [0x05, 0x06, 0x07, 0x08, 0x09, 0x0A])
arg_list = sys.argv
send_packet(function=int(arg_list[1]))
#while 1:
#    byte = int(binascii.b2a_hex(ser.read()), 16)
#    if byte == 0x7E:
#        if packet:
#            process_packet(packet)
#            packet = []
#    else:
#        packet.append(byte)

