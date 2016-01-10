#ifndef PacketQueue_H
#define PacketQueue_H

#include <Arduino.h>
#include "utils.h"

#define P_H_LENGTH      4
#define P_F_LENGTH      2
#define P_H_F_LENGTH    P_H_LENGTH + P_F_LENGTH

class Packet {
  public:
    byte length;
    byte transactionID;
    byte sourceAddr;
    byte destAddr;
    byte function;
    byte *payload;
    uint16_t CRC;
    Packet();
    Packet(byte, byte*, byte);
    void ComputeCRC();
    byte PacketToArray(byte*);
};

class PacketNode {
  public:
    Packet *packet;
    PacketNode *next;
    PacketNode(Packet*);
    PacketNode* Next();
};

class PacketQueue  {
  public:
    PacketQueue();
    byte length;
    PacketNode *first;
    PacketNode *last;
    void Push(Packet*);
    Packet Pop();
    Packet* Top();

};

#endif
