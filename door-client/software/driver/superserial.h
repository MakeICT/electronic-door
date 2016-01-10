#ifndef SUPERSERIAL_H
#define SUPERSERIAL_H

#include <Arduino.h>
#include "packetqueue.h"
#include "rs485.h"
#include "utils.h"
#include <SoftwareSerial.h>  //DEBUG

#define FLAG        0x7E
#define ESCAPE      0x7D
#define MAX_PACKET_SIZE   64

// Command bytes
#define F_SET_ADDRESS   0x00
#define F_UNLOCK_DOOR   0x01
#define F_LOCK_DOOR     0x02
#define F_SEND_ID       0x03
#define F_PLAY_TUNE     0x05
#define F_DOOR_STATE    0x06
#define F_ALARM_BUTTON  0x07
#define F_SET_LIGHTS    0x08
#define F_GET_UPDATE    0x0A

#define F_ACK           0xAA
#define F_NAK           0xAB

// Reserved Addresses
#define ADDR_MASTER     0x00
#define ADDR_BROADCAST  0xFF


#define S_              0
#define S_WAIT_SEND     1
#define S_ESCAPING      2



class SuperSerial 
{
  public:
    SuperSerial(rs485*, byte);
    void SetDebugPort(SoftwareSerial*);
    int QueueLength();
    void QueueMessage(byte, byte*, byte);
    boolean GetMessage(byte* function, byte message[MAX_PACKET_SIZE], byte* length);
    
  private:
	rs485* bus;
	byte deviceAddress;
    PacketQueue* queue;
    SoftwareSerial* debugPort;
    uint16_t ComputeCRC(uint8_t* data, uint8_t len);
    void ReplyToQuery(byte);
    byte GetPacket();
    void QueuePacket(Packet*);
    void SendPacket(Packet*);
    void SendPacket(uint8_t sourceAddr, uint8_t destAddr, uint8_t function, uint8_t* payload, uint8_t len);
    void SendNAK(uint8_t sourceAddr, uint8_t destAddr);
    void SendACK(uint8_t sourceAddr, uint8_t destAddr);
    PacketQueue packetqueue;
    uint8_t currentPacket[MAX_PACKET_SIZE];
};

#endif

