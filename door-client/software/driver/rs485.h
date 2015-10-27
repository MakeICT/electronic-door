#ifndef RS485_H
#define RS485_H

#include <Arduino.h>
#include <SoftwareSerial.h>

class rs485 {
  public:
    rs485(uint8_t, uint8_t, uint8_t);
    ~rs485();
    char receive();
    int send(uint8_t* data, uint8_t len = 1);
    int available();

  private:
    int ser_dir;
    SoftwareSerial* RS485Serial;
};

#endif
