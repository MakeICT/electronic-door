#ifndef Packet_H
#define Packet_H

#include <Arduino.h>
#include <SoftwareSerial.h>
#include "definitions.h"
#include "utils.h"


#define B_START           0xFA
#define B_STOP            0xFB
#define B_ESCAPE          0xFE

#define MAX_PACKET_SIZE   64
#define P_H_LENGTH        5
#define P_F_LENGTH        2
#define P_H_F_LENGTH      7

class Message {
  public:
    //Initializer
    Message();
    Message(byte function, byte length, byte* payload);

    //Set functions
    void SetMsg(byte function, byte length, byte* payload);

    //Message data
    byte function;
    byte length;
    byte payload[MAX_PACKET_SIZE - P_H_F_LENGTH]; //TODO: this should be made configurable
};

class Packet {
  public:
    //Initializers
    Packet();
    Packet(byte function, byte* payload, byte length);

    //Get functions
    byte SrcAddr();
    byte DestAddr();
    byte TransID();
    uint16_t CRC();
    Message Msg();
    byte Func();
    byte MsgLength();
    byte Size();
    byte Escapes();
    byte EscapedSize();

    //Set functions
    void SetSrcAddr(byte addr);
    void SetDestAddr(byte addr);
    void SetTransID(byte transID);
    void SetMsg(byte function, byte* payload, byte length, byte offset=0);
    void SetDebugPort(SoftwareSerial*);

    //Functions
    uint16_t ComputeCRC();
    bool VerifyCRC();
    void SetCRC(uint16_t crc);
    byte ToArray(byte* array);
    byte ToEscapedArray(byte* array);
    void Escape();

  private:
    SoftwareSerial* debugPort;
    byte size;
    byte escapedSize;

    //Header and footer info
    byte sourceAddr;
    byte destAddr;
    byte transactionID;
    uint16_t crc;

    //Message content
    Message message;
  };
#endif
