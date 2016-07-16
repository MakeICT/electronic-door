ARDUINO_DIR=/home/christian/Downloads/arduino-1.6.9
AVR_TOOLS_DIR=/home/christian/Downloads/arduino-1.6.9/hardware/tools/avr
ARDMK_DIR=../tools/Arduino-Makefile
USER_LIB_PATH = ../lib
OBJDIR = ../build-$(BOARD_TAG)-$(BOARD_SUB)

ARCHITECTURE  = avr
BOARD_TAG     = nano
BOARD_SUB     = atmega328
MONITOR_PORT  = /dev/ttyUSB0

CXXFLAGS = --std=gnu++11 -fno-threadsafe-statics

include $(ARDMK_DIR)/Arduino.mk
