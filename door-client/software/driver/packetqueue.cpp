#include "packetqueue.h"

Packet::Packet()  {
  
}
Packet::Packet(byte function, byte* payload, byte length)  {
  this->function = function;
  this->payload = payload;
  this->length = length + P_H_F_LENGTH;
}

byte Packet::PacketToArray(byte* array)  {
  byte index = 0;
  array[index++] = this->length;
  array[index++] = this->transactionID;
  array[index++] = this->sourceAddr;
  array[index++] = this->destAddr;
  array[index++] = this->function;
  for(;index < this->length - 2; index++)  {
    array[index] = payload[index-5];
  }
  return this->length;
}

void Packet::ComputeCRC()  {
  //this part is borrowed from somewhere....
  //TODO: implement 16 bit CRC
  //return 0xFFFF;
  // Compute the MODBUS RTU CRC
  
  byte data[this->length];
  this->PacketToArray(data);
  uint16_t crc = 0xFFFF;
 
  for (byte pos = 0; pos < this->length; pos++) {
    crc ^= (uint16_t)data[pos];          // XOR byte into least sig. byte of crc
 
    for (int i = 8; i != 0; i--) {    // Loop over each bit
      if ((crc & 0x0001) != 0) {      // If the LSB is set
        crc >>= 1;                    // Shift right and XOR 0xA001
        crc ^= 0xA001;
      }
      else                            // Else LSB is not set
        crc >>= 1;                    // Just shift right
    }
  }
  // Note, this number has low and high bytes swapped, so use it accordingly (or swap bytes)
  //return crc;
  this->CRC = crc;  
}

PacketNode::PacketNode(Packet* p)  {
  packet = p;
  next = NULL;
}

PacketQueue::PacketQueue( )  {
  this->first = NULL;
  this->last = NULL;
  this->length = 0;
}

void PacketQueue::Push(Packet* p)  {
  PacketNode* newPacket = new PacketNode(p);
  if (first == NULL)  {
    this->first = newPacket;
    this->last = newPacket;
  }
  else  {
    this->last->next = newPacket;
    this->last = newPacket;
  }
  this->length += 1;
}

Packet PacketQueue::Pop()  {
  Packet temp = *first->packet;
  PacketNode* previous_first = first;
  this->first = first->next;
  delete previous_first;
  this->length -= 1;
  return temp;
}

Packet* PacketQueue::Top()  {
  return this->first->packet;
}
