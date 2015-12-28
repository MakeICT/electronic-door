#!/usr/bin/env python
# -*- coding: utf8 -*-

# CRC32 MODULE
# 
# Cristian NAVALICI cristian.navalici at gmail dot com

from ctypes import c_ulong

class CRC32(object):
    crc32_tab = []

    # The CRC's are computed using polynomials. Here is the most used coefficient for CRC32
    crc32_constant = 0xEDB88320

    def __init__(self):
        if not len(self.crc32_tab): self.init_crc32() # initialize the precalculated tables


    def calculate(self, string = ''):
        try:
            if not isinstance(string, str): raise Exception("Please provide a string as argument for calculation.")
            if not string: return 0

            crcValue = 0xffffffff

            for c in string:
                tmp = crcValue ^ ord(c)
                crcValue = (crcValue >> 8) ^ int(self.crc32_tab[(tmp & 0x00ff)], 0)

            # Only for CRC-32: When all bytes have been processed, take the
            # one's complement of the obtained CRC value
            crcValue ^= 0xffffffff # (or crcValue = ~crcValue)
            return crcValue
        except Exception, e:
            print "EXCEPTION(calculate): {}".format(e)


    def init_crc32(self):
        '''The algorithm use tables with precalculated values'''
        for i in range(0, 256):
            crc = i
            for j in range(0, 8):
                if (crc & 0x00000001):  crc = int(c_ulong(crc >> 1).value) ^ self.crc32_constant
                else:                   crc = int(c_ulong(crc >> 1).value)
            self.crc32_tab.append(hex(crc))

