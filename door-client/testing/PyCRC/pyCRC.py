#!/usr/bin/env python
# -*- coding: utf8 -*-

# EXAMPLE USAGE FOR CRC Module
# 
# Cristian NAVALICI cristian.navalici at gmail dot com
#
# 


from CRCModules.CRC16 import CRC16
from CRCModules.CRC32 import CRC32
from CRCModules.CRC16SICK import CRC16SICK
from CRCModules.CRC16Kermit import CRC16Kermit
from CRCModules.CRC16DNP import CRC16DNP
from CRCModules.CRCCCITT import CRCCCITT


if __name__ == "__main__":
    target = "0123456789"

    target = raw_input("Please provide a string to be CRCed: ")
    print "The results for {} are".format(target)

    print ("CRC-CCITT(XModem) {:10X}".format(CRCCCITT().calculate(target)))
    print ("CRC-CCITT(0xFFFF) {:10X}".format(CRCCCITT(version="FFFF").calculate(target)))
    print ("CRC-CCITT(0x1D0F) {:10X}".format(CRCCCITT(version="1D0F").calculate(target)))
    print ("CRC-16            {:10X}".format(CRC16().calculate(target)))
    print ("CRC-16 (Modbus)   {:10X}".format(CRC16(modbus_flag = True).calculate(target)))
    print ("CRC-16 (SICK)     {:10X}".format(CRC16SICK().calculate(target)))
    print ("CRC-DNP           {:10X}".format(CRC16DNP().calculate(target)))
    print ("CRC-32            {:10X}".format(CRC32().calculate(target)))
    print ("CRC-16 (Kermit)   {:10X}".format(CRC16Kermit().calculate(target)))


