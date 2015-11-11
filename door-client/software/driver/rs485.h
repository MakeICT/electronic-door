#ifndef SERIAL_H
#define SERIAL_H

#include <Arduino.h>
#include <SoftwareSerial.h>

#define S_FLAG      0x7F
#define ESCAPE    0x7D

#define IDLING      0
#define RECEIVING   1
#define ESCAPING    2

#define RS485Transmit    HIGH
#define RS485Receive     LOW



class rs485 {
  public:
    rs485(uint8_t, uint8_t, uint8_t);
    ~rs485();
    char receive();
    int send(uint8_t* data, uint8_t len = 1);
    int available();
    void get_packet();
    void send_packet(uint8_t source_addr, uint8_t dest_addr, uint8_t* payload, uint8_t len);

  private:
    int ser_dir;
    SoftwareSerial* RS485Serial;
    uint8_t compute_CRC(uint8_t* data, uint8_t len);
};

#endif
