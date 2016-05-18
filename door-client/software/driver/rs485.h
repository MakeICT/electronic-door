#ifndef RS485_H
#define RS485_H

#include <Arduino.h>
#include <SoftwareSerial.h>
#include "utils.h"
#include "packetqueue.h"

#define RS485_BAUD        9600
#define FLAG              0x7E
#define ESCAPE            0x7D

#define RS485Transmit     HIGH
#define RS485Receive      LOW

#define ERR_COLLISION     0xE1
#define ERR_LOSTDATA      0xE2
#define ERR_BUSY_BUS      0xE3

// Times
#define T_MIN_WAIT      10

class rs485 {
  public:
    rs485(uint8_t);
    byte Receive();
    byte Send(uint8_t* data, uint8_t len = 1);
    inline int Send(uint8_t data);
    int Available();
    void SetDebugPort(SoftwareSerial*);
    
  private:
    uint8_t serDir;
    SoftwareSerial* debugPort;
    unsigned long lastRcv;
};

#endif
