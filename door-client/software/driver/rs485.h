#ifndef RS485_H
#define RS485_H

#include <Arduino.h>
#include <SoftwareSerial.h>

#define FLAG      0x7E
#define ESCAPE    0x7D

// Command bytes
#define F_SET_ADDRESS   0x00
#define F_UNLOCK_DOOR   0x01
#define F_LOCK_DOOR     0x02
#define F_SEND_ID       0x03
#define F_PLAY_TUNE     0x05
#define F_DOOR_STATE    0x06
#define F_ALARM_BUTTON  0x07

// Reserved Addresses
#define ADDR_MASTER     0x00
#define ADDR_BROADCAST  0xFF


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
    int send(uint8_t data);
    int available();
    boolean get_packet(uint8_t dev_addr, uint8_t* packet);
    void send_packet(uint8_t source_addr, uint8_t dest_addr, uint8_t function, uint8_t* payload, uint8_t len);

  private:
    uint8_t ser_dir;
    SoftwareSerial* RS485Serial;
    uint16_t compute_CRC(uint8_t* data, uint8_t len);
    //byte lastPacket[255];
    uint8_t packetIndex;
};

#endif
