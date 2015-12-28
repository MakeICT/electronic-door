#!/usr/bin/env python
# -*- coding: utf8 -*-

# CRC16 MODULE
#
# includes CRC16 and CRC16 MODBUS
# 
# Cristian NAVALICI cristian.navalici at gmail dot com

from ctypes import c_ushort

class CRC16(object):
    crc16_tab = []

    # The CRC's are computed using polynomials. Here is the most used coefficient for CRC16
    crc16_constant = 0xA001 # 40961

    def __init__(self, modbus_flag = False):
        if not len(self.crc16_tab): self.init_crc16()         # initialize the precalculated tables
        self.mdflag = bool(modbus_flag)


    def calculate(self, string = ''):
        try:
            if not isinstance(string, str): raise Exception("Please provide a string as argument for calculation.")
            if not string: return 0

            crcValue = 0x0000 if not self.mdflag else 0xffff

            for c in string:
                tmp = crcValue ^ ord(c)
                crcValue = (c_ushort(crcValue >> 8).value) ^ int(self.crc16_tab[(tmp & 0x00ff)], 0)
            return crcValue
        except Exception, e:
            print "EXCEPTION(calculate): {}".format(e)


    def init_crc16(self):
        '''The algorithm use tables with precalculated values'''
        for i in range(0, 256):
            crc = c_ushort(i).value
            for j in range(0, 8):
                if (crc & 0x0001):  crc = c_ushort(crc >> 1).value ^ self.crc16_constant
                else:               crc = c_ushort(crc >> 1).value
            self.crc16_tab.append(hex(crc))

