#ifndef SUPERSERIAL_H
#define SUPERSERIAL_H

#include <Arduino.h>
#include "definitions.h"
#include "utils.h"
#include "packetqueue.h"
#include "rs485.h"
#include <SoftwareSerial.h>  //DEBUG

// Command bytes
#define F_SET_CONFIG    0x00
#define F_UNLOCK_DOOR   0x01
#define F_LOCK_DOOR     0x02
#define F_SEND_ID       0x03
#define F_SET_LCD       0x04
#define F_PLAY_TUNE     0x05
#define F_DOOR_STATE    0x07
#define F_ALARM_BUTTON  0x06
#define F_SET_LIGHTS    0x08
#define F_DENY_CARD     0x0C
#define F_DOOR_BELL     0x0D
#define F_CLIENT_START  0x0E
#define F_HEARTBEAT     0xCC

#define F_NOP           0x0B
#define F_ACK           0xAA
#define F_NAK           0xAB

// Reserved Addresses
#define ADDR_MASTER     0x00
#define ADDR_BROADCAST  0xFF
#define ADDR_CLIENT_DEFAULT 0xFE

// Other Settings
#define HEARTBEAT_TIMEOUT 60000


class SuperSerial
{
  public:
    SuperSerial(rs485*, byte);
    void SetAddress(byte addr);
    void SetDebugPort(SoftwareSerial*);
    int QueueLength();
    void QueueMessage(byte, byte*, byte);
    bool NewMessage();
    bool DataQueued();
    void Update();
    Message GetMessage();

  private:
    bool newMessage;
    bool dataQueued;

    //Message/Packet Buffers
    Packet receivedPacket;
    Packet queuedPacket;
    Packet responsePacket;

    uint8_t currentTransaction;
    uint32_t lastPacketSend;
    uint8_t retryTimeout;
    uint8_t maxRetries;
    uint8_t retryCount;

    rs485* bus;
    byte deviceAddress;
    SoftwareSerial* debugPort;
    bool GetPacket();
    void SendPacket(Packet*);
    void SendControl(byte function, byte transactionID);
    void SendACK(byte transID);
};

#endif
