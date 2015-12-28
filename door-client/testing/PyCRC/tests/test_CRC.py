#!/usr/bin/env python
# -*- coding: utf8 -*-

import unittest

import sys
sys.path.append(sys.path[0] + "/../CRCModules/")

from CRC16 import CRC16
from CRC32 import CRC32
from CRC16DNP import CRC16DNP
from CRC16Kermit import CRC16Kermit
from CRC16SICK import CRC16SICK
from CRCCCITT import CRCCCITT

class CRC16Test(unittest.TestCase):
    def setUp(self):
        self.crc = CRC16()
        self.crc_modbus = CRC16(modbus_flag = True)

    def testCalculateModBus(self):
        print "Calculated CRC16 MODBUS for 0123456789 should be 0x434D"
        self.assertEqual(self.crc_modbus.calculate("0123456789"), int('0x434D', 0))

    def testModbusInit(self):
        print "Initializing with modbus flag True should setup internal flag to True"
        self.assertEqual(self.crc_modbus.mdflag, 1)

    def testNoneArgCalculate(self):
        print "Providing calculate method with argument set to None should result in an Exception"
        self.assertRaises(Exception, self.crc.calculate(None))

    def testNoArgCalculate(self):
        print "Providing calculate method with no argument should return 0"
        self.assertEqual(self.crc.calculate(), 0)

    def testCalculate(self):
        print "Calculated CRC16 for 0123456789 should be 0x443D"
        self.assertEqual(self.crc.calculate("0123456789"), int('0x443D', 0))

    def testTableItem42(self):
        print "The precalculated table's item #42 should be 0xdf81"
        self.assertEqual(self.crc.crc16_tab[42], '0xdf81')

    def testTableItem10(self):
        print "The precalculated table's item #10 should be 0x780"
        self.assertEqual(self.crc.crc16_tab[10], '0x780')

    def testTableItems(self):
        print "After creating a CRC16 object we must have a precalculated table with 256 items"
        self.assertEqual(len(self.crc.crc16_tab), 256)   
        
    def testTableNotEmpty(self):
        print "After creating a CRC16 object we must have a precalculated table not empty"
        self.assertIsNot(self.crc.crc16_tab, [])        

    def tearDown(self):
        pass



class CRC32Test(unittest.TestCase):
    def setUp(self):
        self.crc = CRC32()

    def testNoneArgCalculate(self):
        print "Providing calculate method with argument set to None should result in an Exception"
        self.assertRaises(Exception, self.crc.calculate(None))

    def testNoArgCalculate(self):
        print "Providing calculate method with no argument should return 0"
        self.assertEqual(self.crc.calculate(), 0)

    def testCalculate(self):
        print "Calculated CRC32 for 0123456789 should be 0xA684C7C6"
        self.assertEqual(self.crc.calculate("0123456789"), int('0xA684C7C6', 0))

    def testTableItem42(self):
        print "The precalculated table's item #42 should be 0xdbbbc9d6"
        self.assertEqual(self.crc.crc32_tab[42], '0xdbbbc9d6')
 
    def testTableItem10(self):
        print "The precalculated table's item #10 should be 0xe0d5e91e"
        self.assertEqual(self.crc.crc32_tab[10], '0xe0d5e91e')

    def testTableItems(self):
        print "After creating a CRC32 object we must have a precalculated table with 256 items"
        self.assertEqual(len(self.crc.crc32_tab), 256)   
        
    def testTableNotEmpty(self):
        print "After creating a CRC32 object we must have a precalculated table not empty"
        self.assertIsNot(self.crc.crc32_tab, [])    



class CRC16DNPTest(unittest.TestCase):
    def setUp(self):
        self.crc = CRC16DNP()

    def testNoneArgCalculate(self):
        print "Providing calculate method with argument set to None should result in an Exception"
        self.assertRaises(Exception, self.crc.calculate(None))

    def testNoArgCalculate(self):
        print "Providing calculate method with no argument should return 0"
        self.assertEqual(self.crc.calculate(), 0)
 
    def testCalculate(self):
        print "Calculated CRC16DNP for 0123456789 should be 0x7267"
        self.assertEqual(self.crc.calculate("0123456789"), int('0x7267', 0))

    def testTableItem42(self):
        print "The precalculated table's item #42 should be 0xba9a"
        self.assertEqual(self.crc.crc16dnp_tab[42], '0xba9a')
 
    def testTableItem10(self):
        print "The precalculated table's item #10 should be 0x9335"
        self.assertEqual(self.crc.crc16dnp_tab[10], '0x9335')

    def testTableItems(self):
        print "After creating a CRC16DNP object we must have a precalculated table with 256 items"
        self.assertEqual(len(self.crc.crc16dnp_tab), 256)   
        
    def testTableNotEmpty(self):
        print "After creating a CRC16DNP object we must have a precalculated table not empty"
        self.assertIsNot(self.crc.crc16dnp_tab, [])  


class CRC16DNPTest(unittest.TestCase):
    def setUp(self):
        self.crc = CRC16DNP()

    def testNoneArgCalculate(self):
        print "Providing calculate method with argument set to None should result in an Exception"
        self.assertRaises(Exception, self.crc.calculate(None))

    def testNoArgCalculate(self):
        print "Providing calculate method with no argument should return 0"
        self.assertEqual(self.crc.calculate(), 0)
 
    def testCalculate(self):
        print "Calculated CRC16DNP for 0123456789 should be 0x7267"
        self.assertEqual(self.crc.calculate("0123456789"), int('0x7267', 0))

    def testTableItem42(self):
        print "The precalculated table's item #42 should be 0xba9a"
        self.assertEqual(self.crc.crc16dnp_tab[42], '0xba9a')
 
    def testTableItem10(self):
        print "The precalculated table's item #10 should be 0x9335"
        self.assertEqual(self.crc.crc16dnp_tab[10], '0x9335')

    def testTableItems(self):
        print "After creating a CRC16DNP object we must have a precalculated table with 256 items"
        self.assertEqual(len(self.crc.crc16dnp_tab), 256)   
        
    def testTableNotEmpty(self):
        print "After creating a CRC16DNP object we must have a precalculated table not empty"
        self.assertIsNot(self.crc.crc16dnp_tab, [])  



class CRC16KermitTest(unittest.TestCase):
    def setUp(self):
        self.crc = CRC16Kermit()

    def testNoneArgCalculate(self):
        print "Providing calculate method with argument set to None should result in an Exception"
        self.assertRaises(Exception, self.crc.calculate(None))

    def testNoArgCalculate(self):
        print "Providing calculate method with no argument should return 0"
        self.assertEqual(self.crc.calculate(), 0)
 
    def testCalculate(self):
        print "Calculated CRC16Kermit for 0123456789 should be 0x6E5F"
        self.assertEqual(self.crc.calculate("0123456789"), int('0x6E5F', 0))

    def testTableItem42(self):
        print "The precalculated table's item #42 should be 0x8e58"
        self.assertEqual(self.crc.crc16kermit_tab[42], '0x8e58')
 
    def testTableItem10(self):
        print "The precalculated table's item #10 should be 0xaf5a"
        self.assertEqual(self.crc.crc16kermit_tab[10], '0xaf5a')

    def testTableItems(self):
        print "After creating a CRC16Kermit object we must have a precalculated table with 256 items"
        self.assertEqual(len(self.crc.crc16kermit_tab), 256)   
        
    def testTableNotEmpty(self):
        print "After creating a CRC16Kermit object we must have a precalculated table not empty"
        self.assertIsNot(self.crc.crc16kermit_tab, [])  


class CRC16SICKTest(unittest.TestCase):
    def setUp(self):
        self.crc = CRC16SICK()

    def testNoneArgCalculate(self):
        print "Providing calculate method with argument set to None should result in an Exception"
        self.assertRaises(Exception, self.crc.calculate(None))

    def testNoArgCalculate(self):
        print "Providing calculate method with no argument should return 0"
        self.assertEqual(self.crc.calculate(), 0)
 
    def testCalculate(self):
        print "Calculated CRC16SICK for 0123456789 should be 0xF6C6"
        self.assertEqual(self.crc.calculate("0123456789"), int('0xF6C6', 0))



class CRCCCITTTest(unittest.TestCase):
    def setUp(self):
        self.crc_1 = CRCCCITT(version = 'XModem')
        self.crc_2 = CRCCCITT(version = 'FFFF')
        self.crc_3 = CRCCCITT(version = '1D0F')

    def testNoVersionInit(self):
        print "Providing no version at initialization should result in an Exception"
        self.assertRaises(Exception, CRCCCITT(version = None))

    def testWrongVersionInit(self):
        print "Providing wrong version at initialization should result in an Exception"
        self.assertRaises(Exception, CRCCCITT(version = 'WrongVersion'))

    def testNoneArgCalculate(self):
        print "Providing calculate method with argument set to None should result in an Exception"
        self.assertRaises(Exception, self.crc_1.calculate(None))

    def testNoArgCalculate(self):
        print "Providing calculate method with no argument should return 0"
        self.assertEqual(self.crc_1.calculate(), 0)

    def testCalculateVersion3(self):
        print "Calculated CRC CCITT (0x1D0F) for 0123456789 should be 0x18A1"
        self.assertEqual(self.crc_3.calculate("0123456789"), int('0x18A1', 0))

    def testCalculateVersion2(self):
        print "Calculated CRC CCITT (0xFFFF) for 0123456789 should be 0x7D61"
        self.assertEqual(self.crc_2.calculate("0123456789"), int('0x7D61', 0))
 
    def testCalculateVersion1(self):
        print "Calculated CRC CCITT (XModem) for 0123456789 should be 0x9C58"
        self.assertEqual(self.crc_1.calculate("0123456789"), int('0x9C58', 0))

    def testTableItem42(self):
        print "The precalculated table's item #42 should be 0x8528"
        self.assertEqual(self.crc_1.crc_ccitt_tab[42], '0x8528')
 
    def testTableItem10(self):
        print "The precalculated table's item #10 should be 0xa14a"
        self.assertEqual(self.crc_1.crc_ccitt_tab[10], '0xa14a')

    def testTableItems(self):
        print "After creating a CRC CCITT object we must have a precalculated table with 256 items"
        self.assertEqual(len(self.crc_1.crc_ccitt_tab), 256)   
        
    def testTableNotEmpty(self):
        print "After creating a CRC CCITT object we must have a precalculated table not empty"
        self.assertIsNot(self.crc_1.crc_ccitt_tab, []) 


 
if __name__ == "__main__":
    suite_crc16 = unittest.TestLoader().loadTestsFromTestCase(CRC16Test)
    unittest.TextTestRunner(verbosity=2).run(suite_crc16)

    suite_crc32 = unittest.TestLoader().loadTestsFromTestCase(CRC32Test)
    unittest.TextTestRunner(verbosity=2).run(suite_crc32)
   
    suite_crc16dnp = unittest.TestLoader().loadTestsFromTestCase(CRC16DNPTest)
    unittest.TextTestRunner(verbosity=2).run(suite_crc16dnp)

    suite_crc16kermit = unittest.TestLoader().loadTestsFromTestCase(CRC16KermitTest)
    unittest.TextTestRunner(verbosity=2).run(suite_crc16kermit) 

    suite_crc16sick = unittest.TestLoader().loadTestsFromTestCase(CRC16SICKTest)
    unittest.TextTestRunner(verbosity=2).run(suite_crc16sick)  

    suite_crcccitt = unittest.TestLoader().loadTestsFromTestCase(CRCCCITTTest)
    unittest.TextTestRunner(verbosity=2).run(suite_crcccitt)  



