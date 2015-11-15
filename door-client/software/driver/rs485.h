#ifndef RS485_H
#define RS485_H

#include <Arduino.h>
#include <SoftwareSerial.h>

#define FLAG      0x7E
#define ESCAPE    0x7D

//Command bytes
#define F_SET_ADDRESS  0x00
#define F_UNLOCK_DOOR  0x01
#define F_LOCK_DOOR    0x02
#define F_SEND_ID      0x03


#define IDLING      0
#define RECEIVING   1
#define ESCAPING    2

#define RS485Transmit    HIGH
#define RS485Receive     LOW



class rs485 {
  public:
    rs485(uint8_t, uint8_t, uint8_t);
    char receive();
    int send(uint8_t* data, uint8_t len = 1);
    int available();
    void get_packet();
    void send_packet(uint8_t source_addr, uint8_t dest_addr, uint8_t function, uint8_t* payload, uint8_t len);

  private:
    uint8_t ser_dir;
    SoftwareSerial* RS485Serial;
    uint8_t compute_CRC(uint8_t* data, uint8_t len);
};

#endif
