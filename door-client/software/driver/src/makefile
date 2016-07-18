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
CXXFLAGS += -D MOD_SERIAL
CXXFLAGS += -D MOD_LIGHT_RING
CXXFLAGS += -D MOD_LATCH
CXXFLAGS += -D MOD_ALARM_BUTTON
CXXFLAGS += -D MOD_DOOR_SWITCH
CXXFLAGS += -D MOD_NFC_READER
#CXXFLAGS += -D MOD_DOORBELL
CXXFLAGS += -D MOD_CHIME
CXXFLAGS += -D MOD_LCD

#Hard code the client address
#This should probably only be used for testing
#CXXFLAGS +=	-D CLIENT_ADDRESS=1	
					
#Set client address
#CFLAGS := -D CLIENT_ADDRESS=0x09	

include $(ARDMK_DIR)/Arduino.mk
