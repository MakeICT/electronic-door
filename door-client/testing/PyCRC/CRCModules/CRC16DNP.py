#!/usr/bin/env python
# -*- coding: utf8 -*-

# CRC16DNP MODULE
#
# 
# Cristian NAVALICI cristian.navalici at gmail dot com

from ctypes import c_ushort

class CRC16DNP(object):
    crc16dnp_tab = []

    # The CRC's are computed using polynomials. Here is the most used coefficient for CRC16 DNP
    crc16dnp_constant = 0xA6BC

    def __init__(self):
        if not len(self.crc16dnp_tab): self.init_crc16dnp()         # initialize the precalculated tables


    def calculate(self, string = ''):
        try:
            if not isinstance(string, str): raise Exception("Please provide a string as argument for calculation.")
            if not string: return 0

            crcValue = 0x0000

            for c in string:
                tmp = crcValue ^ ord(c)
                crcValue = (crcValue >> 8) ^ int(self.crc16dnp_tab[(tmp & 0x00ff)], 0)

            # after processing the one's complement of the CRC is calculated 
            # and the two bytes of the CRC are swapped.
            crcValue ^= 0xffffffff  # (or crcValue = ~crcValue)
            low_byte   = (crcValue & 0xff00) >> 8
            high_byte  = (crcValue & 0x00ff) << 8
            crcValue   = low_byte | high_byte

            return crcValue
        except Exception, e:
            print "EXCEPTION(calculate): {}".format(e)


    def init_crc16dnp(self):
        '''The algorithm use tables with precalculated values'''
        for i in range(0, 256):
            crc = c_ushort(i).value
            for j in range(0, 8):
                if (crc & 0x0001):  crc = c_ushort(crc >> 1).value ^ self.crc16dnp_constant
                else:               crc = c_ushort(crc >> 1).value
            self.crc16dnp_tab.append(hex(crc))

