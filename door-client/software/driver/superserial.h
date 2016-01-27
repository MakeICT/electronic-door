#ifndef SUPERSERIAL_H
#define SUPERSERIAL_H

#include <Arduino.h>
#include "packetqueue.h"
#include "rs485.h"
#include "utils.h"
#include <SoftwareSerial.h>  //DEBUG

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
#define F_NOP           0x0B

#define F_ACK           0xAA
#define F_NAK           0xAB

// Reserved Addresses
#define ADDR_MASTER     0x00
#define ADDR_BROADCAST  0xFF


class SuperSerial 
{
  public:
    SuperSerial(rs485*, byte);
    void SetDebugPort(SoftwareSerial*);
    int QueueLength();
    void QueueMessage(byte, byte*, byte);
    bool NewMessage();
    bool DataQueued();
    void Update();
    Message GetMessage();
    
  private:
    //Message/Packet Buffers
    bool newMessage;
    Packet receivedPacket;
    bool dataQueued;
    Packet queuedPacket;
    Packet responsePacket;
    byte currentTransaction;
    
    rs485* bus;
    byte deviceAddress;
    SoftwareSerial* debugPort;
    void ReplyToQuery(byte);
    bool GetPacket();
    void QueuePacket(Packet*);
    void SendPacket(Packet*);
    void SendControl(byte function, byte transactionID);
    void SendNAK(byte transID);
    void SendACK(byte transID);
    void SendNOP(byte transID);
};

#endif

