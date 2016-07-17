#Point this to your Arduino installation
ARDUINO_DIR=/home/christian/Downloads/arduino-1.6.9

#These files are included in the repo and shouldn't need to be changed
ARDMK_DIR=../tools/Arduino-Makefile
USER_LIB_PATH = ../lib
OBJDIR = ../build-$(BOARD_TAG)-$(BOARD_SUB)

ARCHITECTURE  = avr
BOARD_TAG     = nano
BOARD_SUB     = atmega328
MONITOR_PORT  = /dev/ttyUSB0

CXXFLAGS = --std=gnu++11 -fno-threadsafe-statics

#Specify modules available on the client
CFLAGS = 	-D MOD_SERIAL \
					-D MOD_LIGHT_RING \
					-D MOD_LATCH \
					-D MOD_ALARM_BUTTON \
					-D MOD_DOOR_SWITCH \
					-D MOD_NFC_READER \
#					-D MOD_DOORBELL \
					-D MOD_CHIME \
					-D MOD_LCD 

include $(ARDMK_DIR)/Arduino.mk
