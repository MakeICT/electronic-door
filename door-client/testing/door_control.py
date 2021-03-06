#!/usr/bin/python

import time
import serial
import binascii
import struct
import sys
from CRC16 import CRC16

class DoorControl:
    import RPi.GPIO as GPIO

    GPIO.setmode(GPIO.BCM)

    rw_pin = 18
    GPIO.setup(rw_pin, GPIO.OUT)
    GPIO.output(rw_pin, GPIO.LOW)
    
    checker = CRC16(modbus_flag = True)

    b_flag = 0x7E
    b_esc = 0x7D
    ACK_wait = False
    escaping = False
    client_address = 0x01
    trans_ID = 0x10
    ser = serial.Serial('/dev/ttyAMA0', 9600)
    
    def __init__(self):
        self.set_driver('input');

    def set_port(self, port):
        self.ser = serial.Serial(port, 9600)

    def check_CRC(self, packet):
        return True

    def set_address(self, addr):
        client_address = addr

    def find_port(self):
        pass

    def display_packet():
        print "========================"
        print packet
        print "length:", length
        print "transaction ID:", hex(transactionID)
        print "from:", hex(from_address)
        print "to:", hex(to_address)
        print "------------------------"
        print "function:", function
        print "data:", payload
        print "------------------------"
        print "CRC:", hex(crc[0]), hex(crc[1])
        str1 = ''.join(str(e) for e in packet)
        print str1
        print "Calculated CRC:",
        #print(self.checker.calculate(str1))
        print self.compute_CRC(packet, length -2)
        if not length == len(packet):
            print "ERROR: Packet length incorrect"
        if not self.check_CRC(packet):
            print "ERROR: CRC incorrect"


    def process_packet(self, packet):
        length = len(packet)
        transactionID = packet[0]
        print packet
        if not (length > 3):
            return
        from_address = packet[1]
        to_address = packet[2]
        function = packet[3]
        crc = packet[-2:]
        payload = packet[4:-2]
        if function < 0x0A:
            print function



            

    def compute_CRC(self, data, length):
        crc = 0xFFFF

        pos = 0
        while (pos < length):
            crc ^= data[pos]

            i = 8
            while not i == 0:
                if (crc & 0x0001) !=0:
                    crc >>= 1;
                    crc^= 0xA001
                else:
                    crc >>=1
                i -= 1
            pos += 1
        return crc

    def set_driver(self, mode):
        if mode == 'output':
            self.GPIO.output(self.rw_pin, self.GPIO.LOW)
            time.sleep(0.01)
        elif mode == 'input':
            time.sleep(0.02)
            self.GPIO.output(self.rw_pin, self.GPIO.HIGH)

    def send_packet(self, from_addr=0x00, to_addr=client_address, function=0x00, payload=[]):
        length = len(payload)
        data = ''
        self.set_driver('output');
        for byte in payload:
            if byte == self.b_flag or byte == self.b_esc:
                data = data + chr(self.b_esc)
            data = data + chr(byte)
        packet = chr(self.b_flag) + chr(self.trans_ID) +  chr(from_addr) + chr(to_addr) + chr(function) + chr(length) +  data + chr(0xFF) + chr(0xFF)  + chr(self.b_flag)
        try:
            self.ser.write(packet)
        except AttributeError:
            self.set_driver('input')
            return 1
        self.set_driver('input')
        return 0

    def get_update(self):
        self.send_packet(function=0x0A)

    def receive_packet(self, packet):
        try:
            byte = int(binascii.b2a_hex(self.ser.read()), 16)
        except AttributeError:
            return 1
        if (byte == self.b_esc) and (not self.escaping):
            self.escaping = True;
        elif byte == (self.b_flag) and (not self.escaping):
            if packet:
                return True
                #self.process_packet(packet)
        else:
            packet.append(byte)
            print "received:", byte
            self.escaping = False
            return False

    def CRC16(self, Output):
        crc = 0xFFFF 
        l = len(Output)
        i = 0
        while i < l:
            j = 0
            crc = crc ^ ord(Output[i])
            while j < 8:
                if (crc & 0x1):
                    mask = 0xA001
                else:
                    mask = 0x00
                crc = ((crc >> 1) & 0x7FFF) ^ mask
                j += 1
            i += 1
        if crc < 0:
            crc -= 256
        print Output + chr(crc % 256) + chr(crc / 256)



    #GPIO.cleanup()
if __name__ == '__main__':
    test = DoorControl()
    print test.CRC16(1234)
