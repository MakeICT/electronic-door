#ifndef RS485_H
#define RS485_H

#include <Arduino.h>
#include <SoftwareSerial.h>

#define RS485_BAUD        9600
#define FLAG              0x7E
#define ESCAPE            0x7D

#define RS485Transmit     HIGH
#define RS485Receive      LOW



class rs485 {
  public:
    rs485(uint8_t);
    byte Receive();
    int Send(uint8_t* data, uint8_t len = 1);
    inline int Send(uint8_t data);
    int Available();
    void SetDebugPort(SoftwareSerial*);
    
  private:
    uint8_t serDir;
    SoftwareSerial* debugPort;
};

#endif
