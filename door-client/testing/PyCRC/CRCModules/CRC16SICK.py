#!/usr/bin/env python
# -*- coding: utf8 -*-

# CRC16SICK MODULE
# 
# Cristian NAVALICI cristian.navalici at gmail dot com
#

from ctypes import c_ushort

class CRC16SICK(object):
    # The CRC's are computed using polynomials. Here is the most used coefficient for CRC16 SICK
    crc16SICK_constant = 0x8005

    def __init__(self):
        pass


    def calculate(self, string = ''):
        try:
            if not isinstance(string, str): raise Exception("Please provide a string as argument for calculation.")
            if not string: return 0
            crcValue = 0x0000

            for idx, c in enumerate(string):
                short_c  =  0x00ff & ord(c)

                idx_previous = idx - 1
                prev_c = 0 if idx_previous == -1 else ord(string[idx_previous])
                short_p  = ( 0x00ff & prev_c) << 8;

                if ( crcValue & 0x8000 ):   crcValue = c_ushort(crcValue << 1).value ^ self.crc16SICK_constant
                else:                       crcValue = c_ushort(crcValue << 1).value

                crcValue &= 0xffff
                crcValue ^= ( short_c | short_p )

            # After processing, the one's complement of the CRC is calcluated and the 
            # two bytes of the CRC are swapped.
            low_byte   = (crcValue & 0xff00) >> 8
            high_byte  = (crcValue & 0x00ff) << 8
            crcValue   = low_byte | high_byte;

            return crcValue
        except Exception, e:
            print "EXCEPTION(calculate): {}".format(e)


